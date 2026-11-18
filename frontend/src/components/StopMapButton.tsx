/**
 * US-079: 高德按钮 = 真链接，新开标签页进高德完整页面做导航（嵌入方式已废除）。
 * 路线页只认坐标：地址簿收录的站带坐标开路线页（起点=上一站坐标，首站只带
 * 终点、起点留空手填）；未收录站退回搜索页（目的地自动带出、起点手填）。
 * 当前标签页停留在行程详情，返回即回到上一级行程。
 */
import Icon from '../Icons'
import { buildAmapDirUrl, buildAmapSearchUrl, type DirEnd } from '../lib/amap'
import type { ScheduleItem } from '../lib/countdown'
import { lookupPlaceBook, FIRST_STOP_ORIGIN, type BookedPlace } from '../lib/place-book'

interface StopMapButtonProps {
  item: ScheduleItem
  destination: string
  /** 上一活动站；null/缺省 = 第一站，起点留空由用户手填。 */
  from?: ScheduleItem | null
}

export default function StopMapButton({ item, destination, from = null }: StopMapButtonProps) {
  // 坐标优先读落库真值（路线1），其次地址簿兜底；都没有才退搜索页。
  const endOf = (stop: ScheduleItem, book: BookedPlace | null): DirEnd | null => {
    if (stop.lat != null && stop.lon != null) return { name: stop.name, lat: stop.lat, lon: stop.lon }
    if (book != null) return { name: stop.name, lat: book.lat, lon: book.lon }
    return null
  }
  const toEnd = endOf(item, lookupPlaceBook(item.name))
  // R1：无上一站（首站）时统一固定出发点=珠海南方软件园；地址簿缺该行才退空起点。
  const originBook = lookupPlaceBook(FIRST_STOP_ORIGIN)
  const defaultOrigin: DirEnd | null = originBook != null
    ? { name: FIRST_STOP_ORIGIN, lat: originBook.lat, lon: originBook.lon }
    : null
  const fromEnd = from != null ? endOf(from, lookupPlaceBook(from.name)) : defaultOrigin
  const href = toEnd != null
    ? buildAmapDirUrl(fromEnd, toEnd)
    : buildAmapSearchUrl([item.name, destination].filter(Boolean).join(' '))
  const title = toEnd == null
    ? '高德导航（起点手填）'
    : fromEnd != null ? `从 ${fromEnd.name} 出发` : '高德导航（起点手填）'
  return (
    <a
      className="map-btn"
      href={href}
      target="_blank"
      rel="noopener"
      aria-label={fromEnd != null ? `在高德中规划 ${fromEnd.name} 到 ${item.name} 的路线` : `在高德中打开 ${item.name} 导航`}
      title={title}
    >
      <Icon name="pin" className="sm" /> 高德
    </a>
  )
}
