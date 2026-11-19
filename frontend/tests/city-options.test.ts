import test from 'node:test'
import assert from 'node:assert/strict'
import { CITIES, cityForDestination } from '../src/pages/city-options.ts'

test('C1 only the simulated cities are offered, each with a real destination value', () => {
  assert.deepEqual(CITIES.map((city) => city.destination), ['珠海', '香港'])
  assert.deepEqual(CITIES.map((city) => city.label), ['珠海', '香港'])
})

test('C2 every city destination resolves to the photo the trip artwork uses', () => {
  for (const city of CITIES) {
    const found = cityForDestination(city.destination)
    assert.equal(found?.id, city.id)
    assert.match(city.photo, /^var\(--photo-(zhuhai|hongkong)\)$/)
  }
  assert.equal(cityForDestination('珠海')?.photo, 'var(--photo-zhuhai)')
  assert.equal(cityForDestination('香港')?.photo, 'var(--photo-hongkong)')
})

test('C3 an unknown or padded destination is not forced onto a city', () => {
  assert.equal(cityForDestination('重庆'), undefined)
  assert.equal(cityForDestination(''), undefined)
  assert.equal(cityForDestination('  香港  ')?.id, 'hongkong')
})

test('C4 each city carries editable start/end landmark defaults', () => {
  for (const city of CITIES) {
    assert.ok(city.defaultStart.length > 0)
    assert.ok(city.defaultEnd.length > 0)
    assert.ok(city.defaultStart.length <= 30)
    assert.ok(city.defaultEnd.length <= 30)
  }
})