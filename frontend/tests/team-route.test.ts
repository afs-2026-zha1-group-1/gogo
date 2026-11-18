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
  assert.equal(model.forkRow, null)

  const firstStage = model.rows[0]
  assert.equal(firstStage.kind, 'branch-pair')
  assert.equal(firstStage.kind === 'branch-pair' ? firstStage.a?.title : null, 'City Hall MRT')
  assert.equal(firstStage.kind === 'branch-pair' ? firstStage.a?.meta : null, '活动 · 30 分钟')
  assert.equal(firstStage.kind === 'branch-pair' ? firstStage.b?.title : null, '咖啡')
  assert.equal(firstStage.kind === 'branch-pair' ? firstStage.b?.meta : null, '活动 · 45 分钟')

  const secondStage = model.rows[1]
  assert.equal(secondStage.kind === 'branch-pair' ? secondStage.a?.title : null, '路程')
  assert.equal(secondStage.kind === 'branch-pair' ? secondStage.b?.title : null, '路程')
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
