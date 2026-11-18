import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAmapDirUrl, buildAmapSearchUrl, stopMapHref } from '../src/lib/amap.ts'

// US-079：坐标路径已删除；导航=电脑版搜索页直链（不经 uri.amap.com 的 UA 跳转）。
function queryOf(url: string): URLSearchParams {
  assert.ok(url.startsWith('https://www.amap.com/search?'), `应为电脑版直链：${url}`)
  return new URLSearchParams(url.slice('https://www.amap.com/search?'.length))
}

test('导航链接为电脑版搜索页直链，关键词原样可达', () => {
  const params = queryOf(buildAmapSearchUrl('珠海市香洲区渔湾路129号珠海大剧院'))
  assert.equal(params.get('query'), '珠海市香洲区渔湾路129号珠海大剧院')
})

test('不同站点搜索词不同，不会串站（AC4）', () => {
  const a = queryOf(buildAmapSearchUrl('Merlion Park'))
  const b = queryOf(buildAmapSearchUrl('City Hall MRT'))
  assert.notEqual(a.get('query'), b.get('query'))
})

test('中文与特殊字符正确编码', () => {
  const url = buildAmapSearchUrl('滨海湾码头 & 集合点')
  assert.ok(!url.includes(' '), 'URL 不应包含未编码空格')
  const params = queryOf(url)
  assert.equal(params.get('query'), '滨海湾码头 & 集合点')
})

test('站名+城市拼词消歧', () => {
  const params = queryOf(buildAmapSearchUrl('太平山顶与凌霄阁 香港'))
  assert.equal(params.get('query'), '太平山顶与凌霄阁 香港')
})

// stopMapHref：坐标优先读落库真值 → 地址簿 → 搜索页；首站固定出发点 R1。
test('stopMapHref：落库坐标优先于地址簿', () => {
  const { href } = stopMapHref({ name: 'Merlion Park', lat: 1.5, lon: 103.9 }, null, 'Singapore')
  const params = new URLSearchParams(href.slice('https://www.amap.com/dir?'.length))
  assert.equal(params.get('to[lnglat]'), '103.9,1.5')
})

test('stopMapHref：无落库坐标读地址簿（海外不纠偏）', () => {
  const { href } = stopMapHref({ name: 'Merlion Park', lat: null, lon: null }, null, 'Singapore')
  const params = new URLSearchParams(href.slice('https://www.amap.com/dir?'.length))
  assert.equal(params.get('to[lnglat]'), '103.8545,1.2868')
})

test('stopMapHref：首站固定出发点珠海南方软件园（R1，国内纠偏）', () => {
  const { href, originName } = stopMapHref({ name: '港珠澳大桥珠海公路口岸', lat: null, lon: null }, null, '珠海')
  assert.equal(originName, '珠海南方软件园')
  const params = new URLSearchParams(href.slice('https://www.amap.com/dir?'.length))
  const from = (params.get('from[lnglat]') ?? '').split(',').map(Number)
  assert.notEqual(from[1], 22.375463) // 国内须纠偏
  assert.ok(Math.abs(from[1] - 22.372424) < 1e-4)
})

test('stopMapHref：第二站起点=上一站', () => {
  const { href, originName } = stopMapHref(
    { name: '中环至半山自动扶梯', lat: null, lon: null },
    { name: '港珠澳大桥珠海公路口岸', lat: null, lon: null },
    '珠海',
  )
  assert.equal(originName, '港珠澳大桥珠海公路口岸')
  const params = new URLSearchParams(href.slice('https://www.amap.com/dir?'.length))
  assert.ok(params.get('from[lnglat]'))
  assert.ok(params.get('to[lnglat]'))
})

test('stopMapHref：未收录站退搜索页（E6/E9）', () => {
  const { href, originName } = stopMapHref({ name: 'Penang Hill Funicular', lat: null, lon: null }, null, 'Penang')
  assert.equal(originName, null)
  const params = queryOf(href)
  assert.equal(params.get('query'), 'Penang Hill Funicular Penang')
})

test('stopMapHref：上一站未收录时首站口径回退固定出发点', () => {
  const { href, originName } = stopMapHref(
    { name: 'Merlion Park', lat: null, lon: null },
    { name: 'Unknown Stop', lat: null, lon: null },
    'Singapore',
  )
  assert.equal(originName, '珠海南方软件园')
  assert.ok(href.startsWith('https://www.amap.com/dir?'))
})

test('路线直链带起点与终点坐标（上一站→本站，lnglat 经度在前）', () => {
  const url = buildAmapDirUrl(
    { name: '港珠澳大桥珠海公路口岸', lat: 22.2216, lon: 113.558 },
    { name: '中环至半山自动扶梯', lat: 22.2836, lon: 114.1552 },
  )
  assert.ok(url.startsWith('https://www.amap.com/dir?'), `应为电脑版路线页：${url}`)
  const params = new URLSearchParams(url.slice('https://www.amap.com/dir?'.length))
  assert.equal(params.get('from[name]'), '港珠澳大桥珠海公路口岸')
  assert.equal(params.get('to[name]'), '中环至半山自动扶梯')
  const fromLnglat = (params.get('from[lnglat]') ?? '').split(',').map(Number)
  const toLnglat = (params.get('to[lnglat]') ?? '').split(',').map(Number)
  assert.equal(fromLnglat.length, 2)
  assert.equal(toLnglat.length, 2)
  // 珠海在国内须纠偏（不等于原 WGS 值）；香港在海外不纠偏。
  assert.notEqual(fromLnglat[1], 22.2216)
  assert.equal(toLnglat[0], 114.1552)
  assert.equal(toLnglat[1], 22.2836)
})

test('首站只带终点：起点留空由用户手填', () => {
  const url = buildAmapDirUrl(null, { name: '港珠澳大桥珠海公路口岸', lat: 22.2216, lon: 113.558 })
  const params = new URLSearchParams(url.slice('https://www.amap.com/dir?'.length))
  assert.equal(params.get('from[name]'), null)
  assert.equal(params.get('from[lnglat]'), null)
  assert.ok(params.get('to[lnglat]'))
})
