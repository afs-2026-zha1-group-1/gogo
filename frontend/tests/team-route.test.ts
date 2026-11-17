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
    'join',
    'main',
  ])
  assert.equal(model.forkRow, 1)
  assert.equal(model.joinRow, 8)
  assert.equal(model.routeLabels.a, 'Route A · 潜水')
  assert.equal(model.routeLabels.b, 'Route B · 咖啡')
  const branchTitles = model.rows.filter((row) => row.kind === 'branch').map((row) => row.title)
  assert.deepEqual(branchTitles, ['潜水', '咖啡', '前往会合点', '前往会合点', '缓冲', '缓冲'])
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
