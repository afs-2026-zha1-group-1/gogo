import test from 'node:test'
import assert from 'node:assert/strict'
import { fromGcj02, outOfChina, toGcj02 } from '../src/lib/coord.ts'

// US-079：WGS-84 → GCJ-02 纠偏口径（国内加偏、海外原样）。
test('海外点不纠偏（新加坡/香港/伦敦）', () => {
  for (const [lat, lon] of [[1.2868, 103.8545], [22.2836, 114.1552], [51.5194, -0.127]]) {
    assert.deepEqual(toGcj02(lat, lon), { lat, lon })
  }
})

test('港澳不纠偏但珠海口岸要纠偏（排除框边界）', () => {
  assert.deepEqual(toGcj02(22.19, 113.54), { lat: 22.19, lon: 113.54 }) // 澳门
  const zh = toGcj02(22.2216, 113.558) // 珠海口岸
  assert.notEqual(zh.lat, 22.2216)
  const hn = toGcj02(19.0, 109.0) // 海南仍属国内须纠偏
  assert.notEqual(hn.lat, 19.0)
})

test('国内点纠偏：偏移量在合理范围（约几百米）', () => {
  const wgs = { lat: 22.2216, lon: 113.558 } // 珠海
  const gcj = toGcj02(wgs.lat, wgs.lon)
  const dLat = gcj.lat - wgs.lat
  const dLon = gcj.lon - wgs.lon
  assert.ok(!outOfChina(wgs.lat, wgs.lon))
  assert.ok(Math.abs(dLat) > 0.0005 && Math.abs(dLat) < 0.01, `纬偏异常：${dLat}`)
  assert.ok(Math.abs(dLon) > 0.0005 && Math.abs(dLon) < 0.01, `经偏异常：${dLon}`)
})

test('纠偏结果稳定且可复算（同输入同输出）', () => {
  const a = toGcj02(39.908722, 116.397499)
  const b = toGcj02(39.908722, 116.397499)
  assert.deepEqual(a, b)
  assert.ok(Number.isFinite(a.lat) && Number.isFinite(a.lon))
})

// fromGcj02：高德查到的 GCJ-02 坐标落库前反解回 WGS-84，避免拼网址时双重加偏。
test('fromGcj02：国内点往返误差小于 1e-6 度（约 0.1 米）', () => {
  for (const [lat, lon] of [[29.5630, 106.5516], [22.2216, 113.558], [39.908722, 116.397499]]) {
    const gcj = toGcj02(lat, lon)
    const back = fromGcj02(gcj.lat, gcj.lon)
    assert.ok(Math.abs(back.lat - lat) < 1e-6, `纬向往返误差过大：${back.lat - lat}`)
    assert.ok(Math.abs(back.lon - lon) < 1e-6, `经向往返误差过大：${back.lon - lon}`)
  }
})

test('fromGcj02：海外及港澳点原样返回', () => {
  assert.deepEqual(fromGcj02(1.2868, 103.8545), { lat: 1.2868, lon: 103.8545 })
  assert.deepEqual(fromGcj02(22.19, 113.54), { lat: 22.19, lon: 113.54 })
})
