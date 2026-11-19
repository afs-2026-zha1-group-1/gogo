import test from 'node:test'
import assert from 'node:assert/strict'
import { stopPhoto } from '../src/lib/stop-photo.ts'

test('S1 Zhuhai and Hong Kong stops resolve to their own photo', () => {
  assert.equal(stopPhoto('日月贝（珠海大剧院）', '珠海')?.src, '/images/stops/stop-zhuhai-opera.jpg')
  assert.equal(stopPhoto('情侣路', '珠海')?.src, '/images/stops/stop-lovers-road.jpg')
  assert.equal(stopPhoto('长隆', '珠海')?.src, '/images/stops/stop-chimelong.jpg')
  assert.equal(stopPhoto('维多利亚港', '香港')?.src, '/images/stops/stop-victoria-harbour.jpg')
  assert.equal(stopPhoto('太平山顶', '香港')?.src, '/images/stops/stop-victoria-peak.jpg')
  assert.equal(stopPhoto('香港迪士尼乐园', '香港')?.src, '/images/stops/stop-hk-disneyland.jpg')
})

test('S2 the same stop matched by a partial name still resolves, with alt text', () => {
  const short = stopPhoto('日月贝', '珠海')
  const long = stopPhoto('日月贝（珠海大剧院）', '珠海')
  assert.equal(short?.src, long?.src)
  assert.ok(short?.alt && short.alt.length > 0)
})

test('S3 AI-generated and non-simulated destinations never borrow a city photo', () => {
  // 其他目的地即使站名撞车也不上图
  assert.equal(stopPhoto('尖沙咀', '新加坡'), null)
  assert.equal(stopPhoto('旺角', '重庆'), null)
  assert.equal(stopPhoto('日月贝（珠海大剧院）', null), null)
  assert.equal(stopPhoto('Kyoto Station', 'Kyoto'), null)
})

test('S4 unmatched stops inside a simulated city keep the icon layout', () => {
  assert.equal(stopPhoto('午餐', '珠海'), null)
  assert.equal(stopPhoto('回酒店午休', '香港'), null)
  assert.equal(stopPhoto('港珠澳大桥珠海公路口岸', '珠海'), null)
})

test('S5 English destination spellings are accepted', () => {
  assert.notEqual(stopPhoto('维多利亚港', 'Hong Kong'), null)
  assert.notEqual(stopPhoto('情侣路', 'Zhuhai'), null)
})