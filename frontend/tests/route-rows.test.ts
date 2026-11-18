import test from 'node:test'
import assert from 'node:assert/strict'
import { cardRowOrder, hasEntryLeg } from '../src/features/split/route-rows.ts'

test('main-plan group: each leg follows its step', () => {
  assert.equal(hasEntryLeg(2, 2), false)
  assert.deepEqual(cardRowOrder(2, 2), [
    { kind: 'step', step: 0 },
    { kind: 'leg', leg: 0 },
    { kind: 'step', step: 1 },
    { kind: 'leg', leg: 1 },
  ])
})

test('entry leg: origin row, then leg before its step', () => {
  assert.equal(hasEntryLeg(1, 2), true)
  assert.deepEqual(cardRowOrder(1, 2), [
    { kind: 'origin' },
    { kind: 'leg', leg: 0 },
    { kind: 'step', step: 0 },
    { kind: 'leg', leg: 1 },
  ])
})

test('entry leg survives an added step', () => {
  assert.deepEqual(cardRowOrder(2, 3), [
    { kind: 'origin' },
    { kind: 'leg', leg: 0 },
    { kind: 'step', step: 0 },
    { kind: 'leg', leg: 1 },
    { kind: 'step', step: 1 },
    { kind: 'leg', leg: 2 },
  ])
})

test('legacy activity without steps keeps the origin and its legs', () => {
  assert.deepEqual(cardRowOrder(0, 2), [
    { kind: 'origin' },
    { kind: 'leg', leg: 0 },
    { kind: 'leg', leg: 1 },
  ])
})
