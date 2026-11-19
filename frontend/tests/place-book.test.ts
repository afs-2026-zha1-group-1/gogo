import test from 'node:test'
import assert from 'node:assert/strict'
import { lookupPlaceAddress, lookupPlaceBook, FIRST_STOP_ORIGIN } from '../src/lib/place-book.ts'

// US-079：地址簿存地址文字+真实坐标（坐标只供路线直链）。覆盖演示夹具站点名。
test('地址簿命中演示站点且地址非空', () => {
  const address = lookupPlaceAddress('天星小轮（尖沙咀 → 中环）')
  assert.ok(address && address.length > 0)
  assert.ok(address.includes('尖沙咀'))
})

test('地址簿覆盖三套演示夹具的全部站点名', () => {
  const names = [
    'City Hall MRT', 'National Gallery Singapore', 'Gardens by the Bay', 'Merlion Park',
    '西九文化区 M+ 博物馆', '天星小轮（尖沙咀 → 中环）', '中环街市与半山扶梯',
    '太平山顶与凌霄阁', '铜锣湾时代广场', '尖沙咀海滨长廊与星光大道',
    '大英博物馆', '考文特花园', '国家美术馆与特拉法加广场', '博罗市场午餐',
    '伦敦塔与塔桥', '泰晤士河游船（塔桥 → 威斯敏斯特）', '伦敦眼与南岸夜景',
  ]
  for (const name of names) assert.ok(lookupPlaceAddress(name), `应收录：${name}`)
})

test('珠海/香港 mock 地点都有地址和有限坐标', () => {
  const names = [
    '日月贝（珠海大剧院）', '爱情邮局', '情侣路', '圆明新园', '珠海长隆海洋王国', '野狸岛',
    '珠海星湾飞行营地', '海泉湾渔人码头', '湾仔海鲜街',
    '维多利亚港', '太平山顶', '旺角', '尖沙咀', '香港迪士尼乐园', '星光大道',
  ]
  for (const name of names) {
    const place = lookupPlaceBook(name)
    assert.ok(place, `应收录：${name}`)
    assert.ok(place.address.length > 0)
    assert.ok(Number.isFinite(place.lat) && Number.isFinite(place.lon))
  }
})

test('未收录站点返回 null，弹窗退回站点名搜索', () => {
  assert.equal(lookupPlaceAddress('日月贝'), null)
  assert.equal(lookupPlaceBook('日月贝'), null)
})

test('收录站点带有限坐标（路线直链用）', () => {
  for (const name of ['港珠澳大桥珠海公路口岸', '中环至半山自动扶梯', 'Merlion Park', '大英博物馆']) {
    const place = lookupPlaceBook(name)
    assert.ok(place, `应收录：${name}`)
    assert.ok(Number.isFinite(place.lat) && Number.isFinite(place.lon))
    assert.ok(Math.abs(place.lat) <= 90 && Math.abs(place.lon) <= 180)
  }
})

test('不同站点地址不同，不会串站（AC4）', () => {
  assert.notEqual(lookupPlaceAddress('Merlion Park'), lookupPlaceAddress('City Hall MRT'))
})

test('R1 首站固定出发点在地址簿且坐标有限', () => {
  assert.equal(FIRST_STOP_ORIGIN, '珠海南方软件园')
  const origin = lookupPlaceBook(FIRST_STOP_ORIGIN)
  assert.ok(origin)
  assert.ok(Math.abs(origin.lat - 22.375463) < 1e-6 && Math.abs(origin.lon - 113.572607) < 1e-6)
  assert.ok(origin.address.includes('软件园路1号'))
})
