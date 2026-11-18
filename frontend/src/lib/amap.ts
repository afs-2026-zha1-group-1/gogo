/**
 * US-079: 高德导航链接（消费版，无需 Key、公司网络可达）。路线页实测只认
 * 坐标不认名字（登录也不认），故路线直链必须带 lnglat；国内点先 WGS→GCJ 纠偏。
 * 搜索页直链供未收录站点兜底（目的地自动带出、起点手填）。
 * 不经 uri.amap.com 入口——它会按浏览器 UA 把部分环境导到手机版纯壳页。
 */
import { toGcj02 } from './coord.ts'
import { lookupPlaceBook, FIRST_STOP_ORIGIN } from './place-book.ts'

/** 路线端点：名称 + 真实 WGS-84 坐标。 */
export interface DirEnd {
  name: string
  lat: number
  lon: number
}

/** 电脑版搜索页直链：query=站名+城市，打开即自动搜索带出目的地。 */
export function buildAmapSearchUrl(keyword: string): string {
  const params = new URLSearchParams({ query: keyword })
  return `https://www.amap.com/search?${params.toString()}`
}

/**
 * 电脑版路线规划直链：终点必带；起点=null 时只带终点（起点口径由调用方
 * stopMapHref 决定：上一站 / R1 固定出发点）。坐标经 GCJ-02 纠偏后以 lng,lat 序写入 from/to[lnglat]。
 */
export function buildAmapDirUrl(from: DirEnd | null, to: DirEnd): string {
  const toG = toGcj02(to.lat, to.lon)
  const params = new URLSearchParams({
    'to[name]': to.name,
    'to[lnglat]': `${toG.lon},${toG.lat}`,
  })
  if (from != null) {
    const fromG = toGcj02(from.lat, from.lon)
    params.set('from[name]', from.name)
    params.set('from[lnglat]', `${fromG.lon},${fromG.lat}`)
  }
  return `https://www.amap.com/dir?${params.toString()}`
}

/** 导航端点输入：落库坐标可缺（null = 未补全）。 */
export interface MapStop {
  name: string
  lat?: number | null
  lon?: number | null
}

/**
 * 站点导航链接决策（纯函数）：坐标优先落库真值 → 地址簿 → 搜索页兜底；
 * 起点=上一站，首站（或上一站未收录）统一固定出发点珠海南方软件园（R1）。
 * 返回 originName 供按钮 title/aria 使用；退搜索页时为 null。
 */
export function stopMapHref(
  item: MapStop,
  from: MapStop | null,
  destination: string,
): { href: string; originName: string | null } {
  const endOf = (stop: MapStop): DirEnd | null => {
    if (stop.lat != null && stop.lon != null) return { name: stop.name, lat: stop.lat, lon: stop.lon }
    const book = lookupPlaceBook(stop.name)
    return book != null ? { name: stop.name, lat: book.lat, lon: book.lon } : null
  }
  const toEnd = endOf(item)
  const originBook = lookupPlaceBook(FIRST_STOP_ORIGIN)
  const defaultOrigin: DirEnd | null = originBook != null
    ? { name: FIRST_STOP_ORIGIN, lat: originBook.lat, lon: originBook.lon }
    : null
  const fromEnd = (from != null ? endOf(from) : null) ?? defaultOrigin
  if (toEnd == null) {
    return {
      href: buildAmapSearchUrl([item.name, destination].filter(Boolean).join(' ')),
      originName: null,
    }
  }
  return { href: buildAmapDirUrl(fromEnd, toEnd), originName: fromEnd?.name ?? null }
}
