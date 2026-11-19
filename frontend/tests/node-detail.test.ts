import test from 'node:test'
import assert from 'node:assert/strict'
import { buildNodeDetail, type NodeDetailContext, type NodeStopInfo } from '../src/features/split/node-detail.ts'
import type { GraphRow } from '../src/features/split/graph-model.ts'
import type { SplitDraftDetail } from '../src/features/split/types.ts'

const round: SplitDraftDetail = {
  roundIndex: 1,
  initiatorMemberId: 'u1',
  mainPlanVersion: 1,
  draftVersion: 1,
  status: 'confirmed',
  splitMode: 'MIDDLE',
  groups: { A: ['u1', 'u2'], B: ['u3'] },
  createdAt: '2026-11-19T00:00:00Z',
  updatedAt: '2026-11-19T00:00:00Z',
  mainPlanStops: [
    {
      id: 's1',
      name: 'City Hall',
      startAt: '2026-11-19T01:00:00Z',
      endAt: '2026-11-19T01:30:00Z',
      costCents: 0,
      locationName: 'City Hall MRT',
    },
    {
      id: 's2',
      name: 'Merlion',
      startAt: '2026-11-19T03:00:00Z',
      endAt: '2026-11-19T03:30:00Z',
      costCents: 1200,
      locationName: 'Merlion Park',
    },
  ],
  departureStopId: 's1',
  reunionStopId: 's2',
  departureAt: '2026-11-19T01:00:00Z',
  reunionAt: '2026-11-19T03:00:00Z',
  windowMinutes: 120,
  routes: [
    {
      groupLabel: 'A',
      activityName: 'Museum',
      locationName: 'National Gallery',
      departureStopId: 's1',
      reunionStopId: 's2',
      activityMinutes: 60,
      travelLegsMinutes: [10, 10],
      bufferMinutes: 5,
      steps: [{ name: 'Museum', minutes: 60 }],
      activities: [
        { name: 'Museum', location: 'National Gallery', costCents: 2500, source: 'ai' },
      ],
    },
    {
      groupLabel: 'B',
      activityName: 'Coffee',
      locationName: 'Tiong Bahru',
      departureStopId: 's1',
      reunionStopId: 's2',
      activityMinutes: 45,
      travelLegsMinutes: [15, 15],
      bufferMinutes: 0,
      steps: [{ name: 'Coffee', minutes: 45 }],
      activities: [
        { name: 'Coffee', location: 'Tiong Bahru', costCents: 800, source: 'ai' },
      ],
    },
  ],
  destination: 'Singapore',
}

function context(): NodeDetailContext {
  const stopsById = new Map<string, NodeStopInfo>([
    ['s1', { locationName: 'City Hall MRT', costCents: 0 }],
    ['s2', { locationName: 'Merlion Park', costCents: 1200 }],
  ])
  return {
    rounds: [round],
    stopsById,
    destination: 'Singapore',
    groupCounts: { a: 2, b: 1 },
    totalMembers: 3,
  }
}

test('US-092 branch activity uses the round route location, cost and group count', () => {
  const row: GraphRow = {
    kind: 'branch',
    id: '1-a-step-0',
    route: 'a',
    title: 'Museum',
    meta: '活动 · 60 分钟',
    roundIndex: 1,
  }

  const detail = buildNodeDetail(row, context())

  assert.equal(detail.badgeLabel, 'Route A · 活动')
  assert.equal(detail.time, '活动 · 60 分钟')
  assert.equal(detail.location, 'National Gallery')
  assert.equal(detail.people, 'Route A · 2 人')
  assert.equal(detail.fee, '人均 S$25')
  assert.deepEqual(detail.tasks, [])
})

test('US-092 missing activity details and todos are omitted, never invented', () => {
  const row: GraphRow = {
    kind: 'branch',
    id: '1-a-step-3',
    route: 'a',
    title: 'Unknown stop',
    meta: '活动 · 30 分钟',
    roundIndex: 1,
  }

  const detail = buildNodeDetail(row, context())

  assert.equal(detail.location, null)
  assert.equal(detail.fee, null)
  assert.deepEqual(detail.tasks, [])
})

test('US-092 travel and buffer rows show no fabricated place or fee', () => {
  const leg: GraphRow = {
    kind: 'branch',
    id: '1-b-leg-0',
    route: 'b',
    title: '路程',
    meta: '路程 · 15 分钟',
    roundIndex: 1,
  }
  const buffer: GraphRow = {
    kind: 'branch',
    id: '1-b-buffer',
    route: 'b',
    title: '缓冲',
    meta: '缓冲 · 5 分钟',
    roundIndex: 1,
  }

  const legDetail = buildNodeDetail(leg, context())
  const bufferDetail = buildNodeDetail(buffer, context())

  assert.equal(legDetail.badgeLabel, 'Route B · 路程')
  assert.equal(legDetail.location, null)
  assert.equal(legDetail.fee, null)
  assert.equal(bufferDetail.badgeLabel, 'Route B · 缓冲')
  assert.equal(bufferDetail.location, null)
  assert.equal(bufferDetail.fee, null)
})

test('US-092 main stops use the snapshot location and per-person cost', () => {
  const row: GraphRow = {
    kind: 'main',
    id: 's2',
    stopId: 's2',
    title: 'Merlion',
    meta: '11:00 – 11:30',
    side: 'right',
  }

  const detail = buildNodeDetail(row, context())

  assert.equal(detail.badgeLabel, '主线站点')
  assert.equal(detail.location, 'Merlion Park')
  assert.equal(detail.people, '全员 · 3 人')
  assert.equal(detail.fee, '人均 S$12')
})

test('US-092 a zero cost is free while an unknown stop stays empty', () => {
  const free: GraphRow = {
    kind: 'main',
    id: 's1',
    stopId: 's1',
    title: 'City Hall',
    meta: '09:00 – 09:30',
    side: 'right',
  }
  const unknown: GraphRow = {
    kind: 'main',
    id: 's9',
    stopId: 's9',
    title: 'Unknown',
    meta: '—',
    side: 'left',
  }

  assert.equal(buildNodeDetail(free, context()).fee, '免费')
  const unknownDetail = buildNodeDetail(unknown, context())
  assert.equal(unknownDetail.location, null)
  assert.equal(unknownDetail.fee, null)
})

test('US-092 junctions use the stop location and all-member count', () => {
  const row: GraphRow = {
    kind: 'fork',
    id: '1-fork-s1',
    stopId: 's1',
    title: 'City Hall',
    meta: '09:00 · 第 1 次分头',
    side: 'right',
    roundIndex: 1,
  }

  const detail = buildNodeDetail(row, context())

  assert.equal(detail.badgeLabel, '分头点')
  assert.equal(detail.location, 'City Hall MRT')
  assert.equal(detail.people, '全员 · 3 人')
  assert.equal(detail.fee, '免费')
})
