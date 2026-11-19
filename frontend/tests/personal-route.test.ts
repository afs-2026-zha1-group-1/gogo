import test from 'node:test'
import assert from 'node:assert/strict'
import {
  derivePersonalRoute,
  derivePersonalRouteFromRounds,
  scheduleFromMainPlan,
  selectSchedule,
} from '../src/lib/personal-route.ts'
import type { SplitDraftDetail, GroupRoute } from '../src/features/split/types.ts'
import type { MainPlan } from '../src/types/mainPlan.ts'

// S2 夹具：2026-11-20 本地时间。共同段 s1–s4；departure=s2（startAt 09:30）、
// reunion=s3（startAt 12:00），窗口 150 分钟；B 组活动 60 分钟居中 → 10:15–11:15。
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
    roundIndex: 1,
    initiatorMemberId: '1',
    mainPlanVersion: 1,
    draftVersion: 1,
    status: 'confirmed',
    splitMode: 'MIDDLE',
    groups: { A: ['1', '2'], B: ['3', '4'] },
    createdAt: iso(8, 0),
    updatedAt: iso(8, 0),
    mainPlanStops,
    departureStopId: 's2',
    reunionStopId: 's3',
    departureAt: iso(9, 30),
    reunionAt: iso(12, 0),
    windowMinutes: 150,
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
  assert.equal(group.start, ms(10, 15))
  assert.equal(group.end, ms(11, 15))
  assert.equal(group.travelMinutesToNext, 15)
  assert.ok(items.every((item) => item.groupLabel !== 'B'))
})

test('shared personal-route items keep the main-plan stop id so they stay editable', () => {
  const idsPlan: MainPlan = {
    ...plan,
    stops: mainPlanStops.map((stop, index) => ({
      id: index + 1,
      seq: index + 1,
      name: index === 0 ? '主线·早餐' : stop.name,
      startTime: '09:00',
      endTime: '09:30',
      travelMinutesToNext: null,
      interests: [`tag-${index}`],
    })),
  }
  const items = derivePersonalRoute(detail(), '1', idsPlan)
  assert.ok(items)
  // 共同段（含清理「主线·」前缀后的同名匹配）拿到主计划站点 id；分组活动行没有 id，保持只读。
  assert.deepEqual(items.map((item) => item.stopId), [1, 2, undefined, 3, 4])
  assert.deepEqual(items[0].interests, ['tag-0'])
})

test('P12 main-line group fills the window with its scheduled stops', () => {
  const d = detail({
    routes: [
      route('A', { activityName: '沿主线方案', steps: [{ name: '出发站', minutes: 30 }] }),
      route('B'),
    ],
  })
  const items = derivePersonalRoute(d, '1', plan)
  assert.ok(items)
  assert.deepEqual(items.map((item) => item.name), ['早餐', '出发站', '会合站', '晚餐'])
  assert.ok(items.every((item) => item.groupLabel !== 'B'))
  const departure = items.find((item) => item.name === '出发站')
  assert.ok(departure)
  assert.equal(departure.groupLabel, 'A')
  assert.equal(departure.start, ms(9, 30))
  assert.equal(departure.end, ms(10, 0))
})

test('P2 different members see different routes (isolation)', () => {
  const alice = derivePersonalRoute(detail(), '1', plan)
  const chloe = derivePersonalRoute(detail(), '3', plan)
  assert.ok(alice && chloe)
  assert.ok(alice.some((item) => item.groupLabel === 'A'))
  assert.ok(chloe.some((item) => item.groupLabel === 'B'))
  assert.ok(chloe.every((item) => item.groupLabel !== 'A'))
})

test('P13 B group with generated steps still renders its own activity, not the main line', () => {
  // ai-split-route-generation: group B now carries steps (station list) just like group A.
  // The main-line judgment must key off the group label, not the presence of steps.
  const d = detail({
    routes: [
      route('A', { steps: [{ name: '出发站', minutes: 30 }] }),
      route('B', {
        activityName: '滨海湾花园',
        steps: [{ name: '滨海湾花园', minutes: 60 }],
      }),
    ],
  })
  const items = derivePersonalRoute(d, '3', plan)
  assert.ok(items)
  // B member's own block is the generated activity, not the shared main-line stops.
  const bBlocks = items.filter((item) => item.groupLabel === 'B')
  assert.equal(bBlocks.length, 1)
  assert.equal(bBlocks[0].name, '滨海湾花园')
  // The B member never gets the shared main-line stop inside the window labeled as their own block.
  const departure = items.find((item) => item.name === '出发站')
  assert.ok(!departure || departure.groupLabel !== 'B')
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

test('B personal route expands every station in order using the outbound and between-station legs', () => {
  const d = detail({
    reunionAt: iso(14, 30),
    routes: [route('A', { steps: [{ name: '出发站', minutes: 30 }] }), route('B', {
      activityName: '甲秀楼 → 花溪公园',
      steps: [
        { name: '甲秀楼', minutes: 50 }, { name: '文昌阁', minutes: 30 },
        { name: '阳明祠', minutes: 40 }, { name: '花溪公园', minutes: 50 },
      ],
      travelLegsMinutes: [20, 10, 15, 35, 40],
      bufferMinutes: 0,
    })],
  })
  const items = derivePersonalRoute(d, '3', plan)
  assert.ok(items)
  const departure = items.find((item) => item.key === 's2')
  assert.ok(departure)
  assert.equal(departure.groupLabel, null)
  assert.equal(departure.start, ms(9, 30))
  assert.equal(departure.end, ms(9, 30))
  assert.equal(departure.kind, 'split-departure')
  assert.equal(departure.travelMinutesToNext, 20)
  const group = items.filter((item) => item.groupLabel === 'B')
  assert.deepEqual(group.map((item) => item.name), ['甲秀楼', '文昌阁', '阳明祠', '花溪公园'])
  assert.deepEqual(group.map((item) => [item.start, item.end]), [
    [ms(9, 50), ms(10, 40)], [ms(10, 50), ms(11, 20)],
    [ms(11, 35), ms(12, 15)], [ms(12, 50), ms(13, 40)],
  ])
  assert.deepEqual(group.map((item) => item.travelMinutesToNext), [10, 15, 35, 40])
  assert.ok(items.indexOf(departure) < items.indexOf(group[0]))
  assert.equal(items.filter((item) => item.key === 's2').length, 1)
  assert.ok(items.some((item) => item.name === '早餐' && item.groupLabel === null))
  assert.ok(items.some((item) => item.name === '晚餐' && item.groupLabel === null))
  assert.ok(items.findIndex((item) => item.name === '会合站') > items.indexOf(group[3]))
  assert.ok(!items.some((item) => item.name === '甲秀楼 → 花溪公园'))
})

test('B stations with incomplete timing remain ordered and have pending times', () => {
  const d = detail({ routes: [route('A'), route('B', {
    steps: [{ name: '甲秀楼', minutes: 30 }, { name: '文昌阁', minutes: 20 }],
    travelLegsMinutes: [10],
  })] })
  const items = derivePersonalRoute(d, '3', plan)
  assert.ok(items)
  const group = items.filter((item) => item.groupLabel === 'B')
  assert.deepEqual(group.map((item) => item.name), ['甲秀楼', '文昌阁'])
  assert.ok(group.every((item) => item.start === null && item.end === null))
  assert.ok(items.findIndex((item) => item.name === '会合站') > items.indexOf(group[1]))
})

test('derivePersonalRouteFromRounds: concatenates confirmed rounds and keeps the join station once', () => {
  const fiveStops = [
    ...mainPlanStops,
    { id: 's5', name: '晚餐二', startAt: iso(13, 0), endAt: iso(13, 30) },
  ]
  const roundOne = detail({ mainPlanStops: fiveStops })
  const roundTwo = detail({
    roundIndex: 2,
    mainPlanStops: fiveStops,
    departureStopId: 's3',
    reunionStopId: 's5',
    departureAt: iso(12, 0),
    reunionAt: iso(13, 0),
    windowMinutes: 60,
    groups: { A: ['1', '3'], B: ['2', '4'] },
    routes: [
      route('A', {
        departureStopId: 's3',
        reunionStopId: 's5',
        activityMinutes: 60,
        travelLegsMinutes: [30, 30],
        steps: [{ name: '会合站', minutes: 30 }, { name: '午餐', minutes: 30 }],
      }),
      route('B', {
        departureStopId: 's3',
        reunionStopId: 's5',
        activityMinutes: 30,
        travelLegsMinutes: [15, 15],
        steps: [{ name: '咖啡二', minutes: 30 }],
      }),
    ],
  })
  const items = derivePersonalRouteFromRounds([roundOne, roundTwo], '3', plan)
  assert.ok(items)
  assert.equal(items.filter((item) => item.name === '会合站').length, 1)
  const roundTwoMain = items.find((item) => item.name === '晚餐' && item.roundIndex === 2)
  assert.ok(roundTwoMain)
  assert.equal(roundTwoMain.groupLabel, 'A')
  assert.equal(roundTwoMain.roundIndex, 2)
  assert.ok(items.some((item) => item.roundIndex === 1 && item.groupLabel === 'B'))
})

test('P12 FROM_START: group B leaves from the first stop without a shared departure', () => {
  const d = detail({ splitMode: 'FROM_START', departureStopId: null, departureAt: iso(9, 0) })
  const names = derivePersonalRoute(d, '3', plan)?.map((item) => item.name)
  assert.deepEqual(names, ['B 组活动', '会合站', '晚餐'])
})

test('P13 FROM_START: group A walks every main stop before the reunion once', () => {
  const d = detail({
    splitMode: 'FROM_START',
    departureStopId: null,
    departureAt: iso(9, 0),
    routes: [
      route('A', { steps: [{ name: '早餐', minutes: 30 }, { name: '出发站', minutes: 30 }] }),
      route('B'),
    ],
  })
  const names = derivePersonalRoute(d, '1', plan)?.map((item) => item.name)
  assert.deepEqual(names, ['早餐', '出发站', '会合站', '晚餐'])
})
