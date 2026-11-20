/**
 * US-079: 高德导航链接（消费版，无需 Key、公司网络可达）。路线页实测只认
 * 坐标不认名字（登录也不认），故路线直链必须带 lnglat；国内点先 WGS→GCJ 纠偏。
 * 搜索页直链仅供终点坐标实在查不到（如海外站）时兜底；正常路径每次点开都带起终点坐标。
 * 不经 uri.amap.com 入口——它会按浏览器 UA 把部分环境导到手机版纯壳页。
 */
import { toGcj02 } from './coord.ts'
import { lookupPlaceBook, FIRST_STOP_ORIGIN } from './place-book.ts'

/** 路线端点：名称 + 真实 WGS-84 坐标（坐标可缺）。 */
export interface DirEnd {
  name: string
  lat?: number | null
  lon?: number | null
}

/** 电脑版搜索页直链：query=站名+城市，打开即自动搜索带出目的地。 */
export function buildAmapSearchUrl(keyword: string): string {
  const params = new URLSearchParams({ query: keyword })
  return `https://www.amap.com/search?${params.toString()}`
}

/** 地理编码关键词：落库地址优先，否则站名+目的地城市（AI 生成的站只有名字没有地址）。 */
export function geocodeKeyword(stop: { name: string; address?: string | null }, destination: string): string {
  return stop.address?.trim() || [stop.name, destination].filter(Boolean).join(' ')
}

/**
 * 电脑版路线规划直链：**始终**写入起点与终点名称，坐标已知时再补 lnglat（GCJ-02 纠偏、经度在前）。
 *
 * 这与旧实现的差别是关键：旧版只要有一个端点查不到坐标就直接退化成搜索页，起点/终点全部丢失。
 * 现在起终点名称永远保留，高德会按名称定位；坐标齐全时直接进路线页。这样「每一站都有起点+终点」。
 */
export function buildAmapDirUrl(from: DirEnd | null, to: DirEnd): string {
  const params = new URLSearchParams({ 'to[name]': to.name })
  if (to.lat != null && to.lon != null) {
    const toG = toGcj02(to.lat, to.lon)
    params.set('to[lnglat]', `${toG.lon},${toG.lat}`)
  }
  if (from != null) {
    params.set('from[name]', from.name)
    if (from.lat != null && from.lon != null) {
      const fromG = toGcj02(from.lat, from.lon)
      params.set('from[lnglat]', `${fromG.lon},${fromG.lat}`)
    }
  }
  return `https://www.amap.com/dir?${params.toString()}`
}

/** 导航端点输入：落库坐标可缺（null = 未补全）。 */
export interface MapStop {
  name: string
  lat?: number | null
  lon?: number | null
  /** 落库/地址簿地址：坐标查不到时用作搜索关键词（比站名+城市更准）。 */
  address?: string | null
}

/**
 * 搜索页关键词：地址优先（地址含门牌/地标，比站名精确），否则站名+目的地城市。
 * 中文地址已带城市时不再重复拼城市，避免「...重庆市 重庆」。
 */
export function searchKeyword(stop: MapStop, destination: string): string {
  const address = stop.address?.trim()
  if (address) {
    if (!destination || address.includes(destination)) return address
    return `${address} ${destination}`
  }
  return [stop.name, destination].filter(Boolean).join(' ')
}

/** 端点坐标解析：落库真值优先，其次地址簿；都没有返回 null（由调用方点击时现查）。 */
export function resolveDirEnd(stop: MapStop): DirEnd | null {
  if (stop.lat != null && stop.lon != null) return { name: stop.name, lat: stop.lat, lon: stop.lon }
  const book = lookupPlaceBook(stop.name)
  return book != null ? { name: stop.name, lat: book.lat, lon: book.lon } : null
}

/** R1 固定出发点：珠海南方软件园（首站或上一站查不到坐标时的起点兜底）。 */
export function defaultDirOrigin(): DirEnd | null {
  const book = lookupPlaceBook(FIRST_STOP_ORIGIN)
  return book != null ? { name: FIRST_STOP_ORIGIN, lat: book.lat, lon: book.lon } : null
}

/**
 * 站点导航链接决策（纯函数）：**永远**返回带起点+终点的路线页链接（/dir）。
 *
 * - 终点：落库坐标 → 地址簿坐标 → 仅名称（高德按名称定位）。
 * - 起点：上一站（落库/地址簿坐标，缺坐标时用名称）→ 行程首站兜底 R1 固定出发点。
 *
 * 不再因为某个端点缺坐标就退化成搜索页 —— 那会让起点和终点一起消失，这正是「有些站没有导航」的原因。
 * originName 供按钮 title/aria 使用。
 */
export function stopMapHref(
  item: MapStop,
  from: MapStop | null,
  destination: string,
): { href: string; originName: string | null } {
  const toEnd = resolveDirEnd(item) ?? nameOnlyEnd(item, destination)
  const resolvedFrom = from != null ? resolveDirEnd(from) ?? nameOnlyEnd(from, destination) : null
  const fromEnd = resolvedFrom ?? defaultDirOrigin()
  return { href: buildAmapDirUrl(fromEnd, toEnd), originName: fromEnd?.name ?? null }
}

/** 坐标未知时的名称端点：站名（地址已知时带上地址，定位更准）。 */
function nameOnlyEnd(stop: MapStop, destination: string): DirEnd {
  const address = stop.address?.trim()
  const name = address
    ? address.includes(stop.name) ? address : `${stop.name} ${address}`
    : [stop.name, destination].filter(Boolean).join(' ')
  return { name }
}
