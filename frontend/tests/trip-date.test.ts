import test from 'node:test'
import assert from 'node:assert/strict'
import { isEnded, todayIso } from '../src/lib/trip-date.ts'

test('isEnded: end before today is ended', () => {
  assert.equal(isEnded('2026-11-05', '2026-11-17'), true)
})

test('isEnded: end equal to today is not ended', () => {
  assert.equal(isEnded('2026-11-17', '2026-11-17'), false)
})

test('isEnded: end after today is not ended', () => {
  assert.equal(isEnded('2026-12-05', '2026-11-17'), false)
})

test('isEnded: lexical order matches date order across year boundary', () => {
  assert.equal(isEnded('2025-12-31', '2026-01-01'), true)
  assert.equal(isEnded('2026-01-01', '2025-12-31'), false)
})

test('todayIso pads month and day', () => {
  assert.equal(todayIso(new Date(2026, 0, 5)), '2026-01-05')
  assert.equal(todayIso(new Date(2026, 10, 17)), '2026-11-17')
})

test('todayIso uses local calendar fields', () => {
  assert.equal(todayIso(new Date(2026, 11, 31)), '2026-12-31')
})
