import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatCountdown,
  localEndOfDay,
  localMidnight,
  resolveCountdown,
  type ScheduleItem,
} from '../src/lib/countdown.ts'

// 本地时间构造（设备本地时区口径，D-2）：2026-11-20 出发，活动 09:30–10:30 / 11:00–12:00。
const departure = localMidnight('2026-11-20')
const tripEnd = localEndOfDay('2026-11-20')
const at = (h: number, m: number) => new Date(2026, 10, 20, h, m, 0, 0).getTime()

function item(key: string, start: number | null, end: number | null): ScheduleItem {
  return { key, name: key, start, end, groupLabel: null, interests: [], address: null, travelMinutesToNext: null }
}

const schedule: ScheduleItem[] = [item('a', at(9, 30), at(10, 30)), item('b', at(11, 0), at(12, 0))]

test('C1 pre-trip: before departure counts down to local midnight', () => {
  const now = new Date(2026, 10, 18, 8, 0, 0).getTime()
  const state = resolveCountdown(now, departure, schedule, tripEnd)
  assert.equal(state.kind, 'pre-trip')
  if (state.kind === 'pre-trip') assert.equal(state.target, departure)
})

test('C2 during: inside an activity shows remaining until end', () => {
  const state = resolveCountdown(at(10, 0), departure, schedule, tripEnd)
  assert.equal(state.kind, 'during')
  if (state.kind === 'during') {
    assert.equal(state.item.key, 'a')
    assert.equal(state.remainingMs, 30 * 60_000)
  }
})

test('C3 between: gap counts down to the next start', () => {
  const state = resolveCountdown(at(10, 45), departure, schedule, tripEnd)
  assert.equal(state.kind, 'between')
  if (state.kind === 'between') {
    assert.equal(state.next.key, 'b')
    assert.equal(state.remainingMs, 15 * 60_000)
  }
})

test('C4 boundary at end switches away from during, never negative', () => {
  const state = resolveCountdown(at(10, 30), departure, schedule, tripEnd)
  assert.equal(state.kind, 'between')
  if (state.kind === 'between') assert.ok(state.remainingMs >= 0)
})

test('C5 boundary at start is during (half-open interval)', () => {
  const state = resolveCountdown(at(11, 0), departure, schedule, tripEnd)
  assert.equal(state.kind, 'during')
  if (state.kind === 'during') assert.equal(state.item.key, 'b')
})

test('C6 after the last activity ends the day is finished', () => {
  const state = resolveCountdown(at(12, 0), departure, schedule, tripEnd)
  assert.equal(state.kind, 'finished')
})

test('C7 no timed activities inside the trip is no-schedule', () => {
  const state = resolveCountdown(at(10, 0), departure, [item('x', null, null)], tripEnd)
  assert.equal(state.kind, 'no-schedule')
})

test('C8 empty schedule after the trip end date is finished', () => {
  const now = new Date(2026, 10, 21, 0, 0, 1).getTime()
  const state = resolveCountdown(now, departure, [], tripEnd)
  assert.equal(state.kind, 'finished')
})

test('C9 formatCountdown clamps negative input to zero', () => {
  const parts = formatCountdown(-5000)
  assert.deepEqual(parts, { days: 0, hh: '00', mm: '00', ss: '00' })
})

test('C10 formatCountdown splits days and pads clock fields', () => {
  assert.deepEqual(formatCountdown(90_061_000), { days: 1, hh: '01', mm: '01', ss: '01' })
  assert.deepEqual(formatCountdown(0), { days: 0, hh: '00', mm: '00', ss: '00' })
})

test('C11 items with unknown times never produce during/between', () => {
  const mixed = [item('x', null, null), item('a', at(9, 30), at(10, 30))]
  const state = resolveCountdown(at(9, 0), departure, mixed, tripEnd)
  assert.equal(state.kind, 'between')
  if (state.kind === 'between') assert.equal(state.next.key, 'a')
})

test('localMidnight/localEndOfDay use local calendar fields', () => {
  assert.equal(localMidnight('2026-11-20'), new Date(2026, 10, 20, 0, 0, 0, 0).getTime())
  assert.equal(localEndOfDay('2026-11-20'), new Date(2026, 10, 20, 23, 59, 59, 999).getTime())
})