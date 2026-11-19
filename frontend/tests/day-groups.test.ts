import test from 'node:test'
import assert from 'node:assert/strict'
import { dayDate, dayIndexOfInstant, dayLabel, defaultDayIndex, groupByDay } from '../src/lib/day-groups.ts'

test('dayDate walks forward from the trip start', () => {
  assert.equal(dayDate('2026-11-19', 1), '2026-11-19')
  assert.equal(dayDate('2026-11-19', 5), '2026-11-23')
  assert.equal(dayDate('2026-11-30', 2), '2026-12-01')
})

test('dayLabel keeps the DAY N · M月D日（周X） shape', () => {
  assert.equal(dayLabel('2026-11-19', 1), 'DAY 1 · 11月19日（周四）')
  assert.equal(dayLabel('2026-11-19', 2), 'DAY 2 · 11月20日（周五）')
})

test('groupByDay orders days and keeps item order', () => {
  const items = [
    { key: 'b', day: 2 },
    { key: 'a', day: 1 },
    { key: 'c', day: 2 },
  ]
  const groups = groupByDay(items, (item) => item.day)
  assert.deepEqual(groups.map((group) => group.dayIndex), [1, 2])
  assert.deepEqual(groups[1].items.map((item) => item.key), ['b', 'c'])
})

test('defaultDayIndex opens today, then clamps outside the trip', () => {
  const days = [1, 2, 3, 4, 5]
  assert.equal(defaultDayIndex(days, 4), 4)
  assert.equal(defaultDayIndex(days, 1), 1)
  assert.equal(defaultDayIndex(days, 9), 5)
  assert.equal(defaultDayIndex([1, 3], 2), 1)
  assert.equal(defaultDayIndex([], 2), undefined)
})

test('dayIndexOfInstant compares local calendar dates', () => {
  assert.equal(dayIndexOfInstant(null, '2026-11-19'), 1)
  assert.equal(dayIndexOfInstant(new Date(2026, 10, 21, 9, 0).getTime(), '2026-11-19'), 3)
  assert.equal(dayIndexOfInstant(new Date(2026, 10, 18, 23, 0).getTime(), '2026-11-19'), 1)
})
