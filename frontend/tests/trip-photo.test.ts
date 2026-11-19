import test from 'node:test'
import assert from 'node:assert/strict'
import { tripPhoto } from '../src/lib/trip-photo.ts'

test('P1 destination keywords pick the matching trip artwork', () => {
  assert.equal(tripPhoto('珠海', 1), 'var(--photo-meadow)')
  assert.equal(tripPhoto('重庆', 2), 'var(--photo-river)')
  assert.equal(tripPhoto('Singapore', 3), 'var(--photo-meadow)')
  assert.equal(tripPhoto('国家博物馆', 4), 'var(--photo-architecture)')
})

test('P2 unmatched destination falls back deterministically from the trip id', () => {
  assert.equal(tripPhoto('Kyoto', 3), tripPhoto('Kyoto', 3))
  assert.match(tripPhoto('Kyoto', 3), /^var\(--photo-/)
})

test('P3 the same trip always renders the same artwork', () => {
  assert.equal(tripPhoto('Penang', 9002), tripPhoto('Penang', 9002))
})