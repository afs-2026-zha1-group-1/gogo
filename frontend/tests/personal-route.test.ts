import test from 'node:test'
import assert from 'node:assert/strict'
import {
  derivePersonalRoute,
  scheduleFromMainPlan,
  selectSchedule,
} from '../src/lib/personal-route.ts'
import type { SplitDraftDetail, GroupRoute } from '../src/features/split/types.ts'
import type { MainPlan } from '../src/types/mainPlan.ts'

// S2 夹具：2026-11-20 本地时间。共同段 s1–s4；departure=s2（endAt 10:00）、
// reunion=s3（startAt 12:00），窗口 120 分钟；A 组活动 60 分钟居中 → 10:30–11:30。
const START_DATE = '2026-11-20'
const iso = (h: number, m: number) => new Date(2026, 10, 20, h, m, 0, 0).toISOString()
const ms = (h: number, m: number) => new Date(2026, 10, 20, h, m, 0, 0).getTime()

const mainPlanStops = [
  { id: 's1', name: '早餐', startAt: iso(9, 0), endAt: iso(9, 30) },
  { id: 's2', name: '出发站', startAt: iso(9, 30), endAt: iso(10, 0) },
  { id: 's3', name: '会合站', startAt: iso(12, 0), endAt: iso(12, 30) },
  { id: 's4', name: '晚餐', startAt: iso(12, 30), endAt: iso(13, 0) },
]

function route(label: string, overrides: Partial<GroupRoute> = {}): GroupRoute {
  return {
    groupLabel: label,
    activityName: `${label} 组活动`,
    departureStopId: 's2',
    reunionStopId: 's3',
    activityMinutes: 60,
    travelLegsMinutes: [15, 15],
    bufferMinutes: 10,
    ...overrides,
  }
}

function detail(overrides: Partial<SplitDraftDetail> = {}): SplitDraftDetail {
  return {
    initiatorMemberId: '1',
    mainPlanVersion: 1,
    draftVersion: 1,
    status: 'confirmed',
    groups: { A: ['1', '2'], B: ['3', '4'] },
    createdAt: iso(8, 0),
    updatedAt: iso(8, 0),
    mainPlanStops,
    departureStopId: 's2',
    reunionStopId: 's3',
    departureAt: iso(10, 0),
    reunionAt: iso(12, 0),
    windowMinutes: 120,
    routes: [route('A'), route('B')],
    destination: 'Singapore',
    ...overrides,
  }
}

const plan: MainPlan = {
  tripId: 1,
  version: 1,
  confirmed: true,
  stale: false,
  costPerPersonCents: 5000,
  inputRevisions: [],
  stops: [
    { seq: 1, name: '早餐', startTime: '09:00', endTime: '09:30', travelMinutesToNext: 10, interests: ['美食'] },
    { seq: 2, name: '出发站', startTime: '09:30', endTime: '10:00', travelMinutesToNext: null, interests: [] },
  ],
}

test('P1 assigned member sees own group route with shared activities', () => {
  const items = derivePersonalRoute(detail(), '1', plan)
  assert.ok(items)
  assert.deepEqual(items.map((item) => item.name), ['早餐', '出发站', 'A 组活动', '会合站', '晚餐'])
  const group = items.find((item) => item.groupLabel === 'A')
  assert.ok(group)
  assert.equal(group.start, ms(10, 30))
  assert.equal(group.end, ms(11, 30))
  assert.equal(group.travelMinutesToNext, 15)
  assert.ok(items.every((item) => item.groupLabel !== 'B'))
})

test('P2 different members see different routes (isolation)', () => {
  const alice = derivePersonalRoute(detail(), '1', plan)
  const chloe = derivePersonalRoute(detail(), '3', plan)
  assert.ok(alice && chloe)
  assert.ok(alice.some((item) => item.groupLabel === 'A'))
  assert.ok(chloe.some((item) => item.groupLabel === 'B'))
  assert.ok(chloe.every((item) => item.groupLabel !== 'A'))
})

test('P3 unassigned member gets no personal route', () => {
  assert.equal(derivePersonalRoute(detail(), '9', plan), null)
})

test('P4 active/cancelled draft falls back to the main plan', () => {
  const fallback = scheduleFromMainPlan(plan, START_DATE)
  for (const status of ['active', 'cancelled'] as const) {
    const items = selectSchedule(detail({ status }), '1', plan, START_DATE)
    assert.deepEqual(items, fallback)
  }
})

test('P5 missing activity duration leaves group times pending (null)', () => {
  const d = detail({ routes: [route('A', { activityMinutes: null }), route('B')] })
  const items = derivePersonalRoute(d, '1', plan)
  const group = items?.find((item) => item.groupLabel === 'A')
  assert.ok(group)
  assert.equal(group.start, null)
  assert.equal(group.end, null)
})

test('P6 over-window activity duration leaves group times pending (null)', () => {
  const d = detail({ routes: [route('A', { activityMinutes: 180 }), route('B')] })
  const group = derivePersonalRoute(d, '1', plan)?.find((item) => item.groupLabel === 'A')
  assert.ok(group)
  assert.equal(group.start, null)
  assert.equal(group.end, null)
})

test('P7 boundary stops stay in the shared segments, group segment appears once', () => {
  const items = derivePersonalRoute(detail(), '1', plan)
  assert.ok(items)
  assert.equal(items.filter((item) => item.name === '出发站').length, 1)
  assert.equal(items.filter((item) => item.name === '会合站').length, 1)
  assert.equal(items.filter((item) => item.groupLabel === 'A').length, 1)
  const keys = items.map((item) => item.key)
  assert.ok(keys.indexOf('s2') < keys.indexOf('group-A'))
  assert.ok(keys.indexOf('group-A') < keys.indexOf('s3'))
})

test('P8 unknown boundary stop ids degrade to all shared stops plus sorted group segment', () => {
  const d = detail({ departureStopId: 'nope', reunionStopId: 'nope' })
  const items = derivePersonalRoute(d, '1', plan)
  assert.ok(items)
  assert.equal(items.length, 5)
  const starts = items.map((item) => item.start ?? Number.MAX_SAFE_INTEGER)
  assert.deepEqual(starts, [...starts].sort((a, b) => a - b))
})

test('P9 main-plan HH:mm stops combine with the trip start date locally', () => {
  const items = scheduleFromMainPlan(plan, START_DATE)
  assert.equal(items.length, 2)
  assert.equal(items[0].start, ms(9, 0))
  assert.equal(items[0].end, ms(9, 30))
  assert.deepEqual(items[0].interests, ['美食'])
  assert.equal(items[0].travelMinutesToNext, 10)
  assert.equal(items[0].groupLabel, null)
  assert.deepEqual(scheduleFromMainPlan(null, START_DATE), [])
})

// T7.3 浏览器验收缺陷回归：组活动卡 interests 硬编码 []，未按名从 main plan 补全。
test('P11 group activity interests are enriched from the main plan by name', () => {
  const planWithGallery: MainPlan = {
    ...plan,
    stops: [
      ...plan.stops,
      { seq: 3, name: 'National Gallery', startTime: '10:30', endTime: '11:30', travelMinutesToNext: null, interests: ['art', 'culture'] },
    ],
  }
  const d = detail({ routes: [route('A', { activityName: 'National Gallery' }), route('B')] })
  const group = derivePersonalRoute(d, '1', planWithGallery)?.find((item) => item.groupLabel === 'A')
  assert.ok(group)
  assert.deepEqual(group.interests, ['art', 'culture'])
  // 名称不匹配时保持空数组，不伪造。
  const unmatched = derivePersonalRoute(detail(), '1', planWithGallery)?.find((item) => item.groupLabel === 'A')
  assert.deepEqual(unmatched?.interests, [])
})

test('P10 selectSchedule priority: personal route > main plan > empty', () => {
  const personal = selectSchedule(detail(), '1', plan, START_DATE)
  assert.ok(personal.some((item) => item.groupLabel === 'A'))
  assert.deepEqual(selectSchedule(null, '1', plan, START_DATE), scheduleFromMainPlan(plan, START_DATE))
  assert.deepEqual(selectSchedule(detail(), '9', null, START_DATE), [])
  assert.deepEqual(selectSchedule(null, null, null, START_DATE), [])
})