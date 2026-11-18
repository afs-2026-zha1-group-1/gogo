import test from 'node:test'
import assert from 'node:assert/strict'
import {
  actionForStatus,
  buildBranchRows,
  buildGraphRows,
  formatMinutes,
  formatTime,
  routeLabelsFor,
  type StopInput,
  type GraphRow,
} from '../src/features/split/graph-model.ts'
import { cleanRouteName, cleanStationName } from '../src/features/split/station-name.ts'

const stops: StopInput[] = [
  { id: 's1', name: 'City Hall MRT', startLabel: '09:00', endLabel: '09:30' },
  { id: 's2', name: 'Merlion Park', startLabel: '10:00', endLabel: '11:00' },
  { id: 's3', name: 'Gardens by the Bay', startLabel: '11:30', endLabel: '12:30' },
  { id: 's4', name: 'Marina Bay Sands', startLabel: '13:00', endLabel: '14:00' },
]

test('buildGraphRows: main-only rows alternate label sides', () => {
  const model = buildGraphRows({ stops, departureStopId: null, reunionStopId: null, routes: [] })
  assert.equal(model.rows.length, 4)
  assert.equal(model.forkRow, null)
  assert.equal(model.joinRow, null)
  assert.deepEqual(
    model.rows.map((row) => (row.kind === 'main' ? row.side : null)),
    ['right', 'left', 'right', 'left'],
  )
})

test('buildGraphRows: boundaries split the main line and interleave A/B branches', () => {
  const model = buildGraphRows({
    stops,
    departureStopId: 's2',
    reunionStopId: 's3',
    routes: [
      { groupLabel: 'A', activityName: '潜水', activityMinutes: 60, travelLegsMinutes: [20, 20], bufferMinutes: 10 },
      { groupLabel: 'B', activityName: '咖啡', activityMinutes: 45, travelLegsMinutes: [30], bufferMinutes: 5 },
    ],
  })
  assert.deepEqual(model.rows.map((row) => row.kind), [
    'main',
    'fork',
    'branch',
    'branch',
    'branch',
    'branch',
    'branch',
    'branch',
    'branch',
    'join',
    'main',
  ])
  assert.equal(model.forkRow, 1)
  assert.equal(model.joinRow, 9)
  assert.equal(model.routeLabels.a, 'Route A · 潜水')
  assert.equal(model.routeLabels.b, 'Route B · 咖啡')
  const branchTitles = model.rows.filter((row) => row.kind === 'branch').map((row) => row.title)
  assert.deepEqual(branchTitles, ['潜水', '路程', '路程', '咖啡', '路程', '缓冲', '缓冲'])
})

test('branch nodes: missing durations render as pending instead of zero', () => {
  const rows = buildBranchRows([
    { groupLabel: 'A', activityName: null, activityMinutes: null, travelLegsMinutes: [null], bufferMinutes: null },
    { groupLabel: 'B', activityName: '咖啡', activityMinutes: 0, travelLegsMinutes: [], bufferMinutes: 0 },
  ])
  assert.deepEqual(rows.map((row) => row.meta), [
    '活动 · 待补全',
    '活动 · 0 分钟',
    '路程 · 待补全',
    '缓冲 · 待补全',
  ])
  assert.equal(rows[0].title, '活动')
  assert.equal(rows.filter((row) => row.route === 'b').length, 1)
})

test('branch nodes: A steps expand per stop while B keeps a single activity', () => {
  const rows = buildBranchRows([
    {
      groupLabel: 'A',
      activityName: '沿主线方案',
      activityMinutes: 65,
      travelLegsMinutes: [30, 30, 15],
      bufferMinutes: 0,
      steps: [
        { name: 'City Hall MRT', minutes: 30 },
        { name: 'National Gallery Singapore', minutes: 20 },
        { name: 'Gardens by the Bay', minutes: 15 },
      ],
    },
    { groupLabel: 'B', activityName: 'Gardens by the Bay', locationName: '滨海湾', activityMinutes: 60, travelLegsMinutes: [20, 20], bufferMinutes: 0, steps: [{ name: 'Gardens by the Bay', minutes: 60 }] },
  ])
  const titles = rows.map((row) => row.title)
  assert.ok(titles.includes('City Hall MRT'))
  assert.ok(titles.includes('National Gallery Singapore'))
  assert.ok(titles.includes('Gardens by the Bay'))
  assert.equal(rows.filter((row) => row.route === 'a' && row.meta.startsWith('活动')).length, 3)
  assert.equal(rows.filter((row) => row.route === 'b' && row.meta.startsWith('活动')).length, 1)
  assert.deepEqual(
    rows.filter((row) => row.route === 'a' && row.meta.startsWith('活动')).map((row) => row.meta),
    ['活动 · 30 分钟', '活动 · 20 分钟', '活动 · 15 分钟'],
  )
  assert.equal(rows.find((row) => row.route === 'b' && row.meta.startsWith('活动'))?.meta, '活动 · 60 分钟')
  assert.equal(rows.filter((row) => row.route === 'a' && row.title === '路程').length, 3)
  assert.equal(rows.filter((row) => row.route === 'b' && row.title === '路程').length, 2)
})

test('buildGraphRows: the fork represents the matching first A stop without losing duration or travel', () => {
  const model = buildGraphRows({
    stops,
    departureStopId: 's1',
    reunionStopId: 's3',
    routes: [
      { groupLabel: 'A', activityName: 'City Hall MRT → Merlion Park', activityMinutes: 90,
        travelLegsMinutes: [20, 15], bufferMinutes: 0,
        steps: [{ name: '主线·City Hall MRT', minutes: 30 }, { name: 'Merlion Park', minutes: 60 }] },
      { groupLabel: 'B', activityName: '咖啡', activityMinutes: 45,
        travelLegsMinutes: [10, 20], bufferMinutes: 0, steps: [{ name: '咖啡', minutes: 45 }] },
    ],
  })
  const fork = model.rows.find((row) => row.kind === 'fork')
  assert.ok(fork)
  assert.match(fork.meta, /A 组活动 · 30 分钟/)
  assert.equal(model.rows.filter((row) => row.title === 'City Hall MRT').length, 1)
  const a = model.rows.filter((row) => row.kind === 'branch' && row.route === 'a')
  assert.deepEqual(a.map((row) => row.title), ['路程', 'Merlion Park', '路程'])
  assert.deepEqual(a.map((row) => row.meta), ['路程 · 20 分钟', '活动 · 60 分钟', '路程 · 15 分钟'])
  assert.ok(model.rows.some((row) => row.kind === 'branch' && row.route === 'b' && row.title === '咖啡'))
})

test('buildGraphRows: a different edited first A stop remains visible', () => {
  const model = buildGraphRows({
    stops,
    departureStopId: 's1',
    reunionStopId: 's3',
    routes: [{ groupLabel: 'A', activityName: '新活动', activityMinutes: 30,
      travelLegsMinutes: [20], bufferMinutes: 0, steps: [{ name: '新活动', minutes: 30 }] }],
  })
  assert.ok(model.rows.some((row) => row.kind === 'branch' && row.route === 'a' && row.title === '新活动'))
})

test('station names drop the generated 主线 marker for display and saving', () => {
  assert.equal(cleanStationName('主线·旧城早餐'), '旧城早餐')
  assert.equal(cleanStationName('主线：滨海美术馆'), '滨海美术馆')
  assert.equal(cleanStationName('Gardens by the Bay'), 'Gardens by the Bay')
  assert.equal(cleanRouteName('主线·旧城早餐 → 主线·滨海美术馆'), '旧城早餐 → 滨海美术馆')
})

test('time formatting keeps ISO and local sources separate', () => {
  assert.equal(formatTime('09:30', 'local'), '09:30')
  assert.match(formatTime('2026-12-05T01:30:00Z', 'iso'), /^\d{2}:\d{2}$/)
  assert.equal(formatTime(null, 'iso'), '待补全')
  assert.equal(formatMinutes(null), '待补全')
  assert.equal(formatMinutes(40), '40 分钟')
})

test('route labels fall back to Route A/B when activity is missing', () => {
  assert.deepEqual(
    routeLabelsFor([
      { groupLabel: 'A', activityName: null, activityMinutes: null, travelLegsMinutes: [], bufferMinutes: null },
      { groupLabel: 'B', activityName: '老城', activityMinutes: 30, travelLegsMinutes: [], bufferMinutes: null },
    ]),
    { a: 'Route A', b: 'Route B · 老城' },
  )
})

test('status action branches: start, continue, confirm, blocked', () => {
  assert.deepEqual(actionForStatus(null, true), { kind: 'start', label: '发起分队' })
  assert.deepEqual(actionForStatus('cancelled', true), { kind: 'start', label: '发起分队' })
  assert.deepEqual(actionForStatus('active', true), { kind: 'boundaries', label: '继续分队' })
  assert.deepEqual(actionForStatus('confirmed', true), { kind: 'confirm', label: '查看已确认分队' })
  assert.deepEqual(actionForStatus(null, false), { kind: 'blocked', label: '发起分队' })
})

test('buildGraphRows: two rounds merge the shared join/fork and keep A/B stages aligned', () => {
  const fiveStops: StopInput[] = [
    ...stops,
    { id: 's5', name: 'Clarke Quay', startLabel: '14:30', endLabel: '15:30' },
  ]
  const model = buildGraphRows({
    stops: fiveStops,
    rounds: [
      {
        roundIndex: 1,
        departureStopId: 's1',
        reunionStopId: 's2',
        routes: [
          { groupLabel: 'A', activityName: 'City Hall MRT', activityMinutes: 30, travelLegsMinutes: [60], bufferMinutes: 0, steps: [{ name: 'City Hall MRT', minutes: 30 }] },
          { groupLabel: 'B', activityName: 'Gallery', activityMinutes: 60, travelLegsMinutes: [15, 15], bufferMinutes: 0, steps: [{ name: 'Gallery', minutes: 60 }] },
        ],
      },
      {
        roundIndex: 2,
        departureStopId: 's2',
        reunionStopId: 's4',
        routes: [
          { groupLabel: 'A', activityName: 'Merlion Park → Gardens by the Bay', activityMinutes: 90, travelLegsMinutes: [30, 30], bufferMinutes: 0, steps: [{ name: 'Merlion Park', minutes: 30 }, { name: 'Gardens by the Bay', minutes: 60 }] },
          { groupLabel: 'B', activityName: 'Wings', activityMinutes: 90, travelLegsMinutes: [30, 30], bufferMinutes: 0, steps: [{ name: 'Wings', minutes: 90 }] },
        ],
      },
    ],
  })
  assert.equal(model.rounds.length, 2)
  const merged = model.rows.find((row) => row.kind === 'join-fork')
  if (merged?.kind !== 'join-fork') throw new Error('missing join-fork')
  assert.equal(merged.title, 'Merlion Park')
  assert.equal(merged.nextRound, 2)
  assert.equal(model.rounds[0].joinRow, model.rounds[1].forkRow)
  assert.equal(
    model.rows.filter((row) => row.kind === 'branch' && row.roundIndex === 2 && row.route === 'a' && row.title === 'Merlion Park').length,
    0,
  )
  const stageRows = model.rows.filter(
    (row): row is Extract<GraphRow, { kind: 'branch' }> => row.kind === 'branch' && row.roundIndex === 2,
  )
  assert.ok(stageRows.some((row) => row.route === 'a'))
  assert.ok(stageRows.some((row) => row.route === 'b'))
})

test('US-095 FROM_START: both lanes open on their own first place', () => {
  const model = buildGraphRows({
    stops,
    splitMode: 'FROM_START',
    departureStopId: null,
    reunionStopId: 's3',
    routes: [
      {
        groupLabel: 'A',
        activityName: '主线',
        activityMinutes: 60,
        travelLegsMinutes: [20, 20],
        bufferMinutes: 0,
        steps: [
          { name: 'City Hall MRT', minutes: 30 },
          { name: 'Merlion Park', minutes: 30 },
        ],
      },
      {
        groupLabel: 'B',
        activityName: '咖啡',
        activityMinutes: 45,
        travelLegsMinutes: [20],
        bufferMinutes: 0,
        steps: [{ name: '咖啡', minutes: 45 }],
      },
    ],
  })
  assert.equal(model.hasBoundaries, true)
  assert.equal(model.fromStart, true)
  assert.equal(model.forkRow, 0)

  const fork = model.rows[0]
  assert.equal(fork.kind, 'fork')
  assert.equal(fork.kind === 'fork' ? fork.title : null, 'City Hall MRT')
  assert.match(fork.kind === 'fork' ? fork.meta : '', /行程起点 · 分头/)
  assert.equal(
    model.rows.filter((row) => row.kind === 'branch' && row.route === 'a' && row.title === 'City Hall MRT').length,
    0,
  )
  assert.ok(model.rows.some((row) => row.kind === 'branch' && row.route === 'b' && row.title === '咖啡'))
  assert.equal(model.rows[model.joinRow ?? -1].kind, 'join')
  assert.equal(model.rows[model.rows.length - 1].kind, 'main')
})

test('US-095 MIDDLE: the fork absorbs A first activity instead of repeating it', () => {
  const model = buildGraphRows({
    stops,
    departureStopId: 's2',
    reunionStopId: 's3',
    routes: [
      {
        groupLabel: 'A',
        activityName: '主线',
        activityMinutes: 30,
        travelLegsMinutes: [15],
        bufferMinutes: 0,
        steps: [{ name: 'Merlion Park', minutes: 30 }],
      },
      {
        groupLabel: 'B',
        activityName: '咖啡',
        activityMinutes: 45,
        travelLegsMinutes: [10, 20],
        bufferMinutes: 0,
        steps: [{ name: '咖啡', minutes: 45 }],
      },
    ],
  })
  const fork = model.rows[model.forkRow ?? -1]
  assert.equal(fork.kind, 'fork')
  assert.equal(fork.kind === 'fork' ? fork.title : null, 'Merlion Park')
  assert.equal(fork.kind === 'fork' ? fork.meta : null, '10:00 · 分头 · A 组活动 · 30 分钟')
  const repeated = model.rows.filter(
    (row) => row.kind === 'branch' && row.route === 'a' && row.title === 'Merlion Park',
  )
  assert.equal(repeated.length, 0)
})
