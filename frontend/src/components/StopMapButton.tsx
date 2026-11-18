/**
 * US-079: 高德按钮 = 真链接，新开标签页进高德完整页面做导航（嵌入方式已废除）。
 * 路线页只认坐标：地址簿收录的站带坐标开路线页（起点=上一站，首站固定珠海南方软件园 R1）；
 * 未收录站退回搜索页（目的地自动带出、起点手填）。当前标签页停留在行程详情，返回即回到上一级行程。
 * 右列布局：高德按钮顶对齐左侧站点图标，其下为逐站"复制地址"按钮（showCopy 可控）。
 */
import { useEffect, useRef, useState } from 'react'
import Icon from '../Icons'
import { buildAmapDirUrl, buildAmapSearchUrl, type DirEnd } from '../lib/amap'
import { copyText } from '../lib/clipboard'
import type { ScheduleItem } from '../lib/countdown'
import { lookupPlaceAddress, lookupPlaceBook, FIRST_STOP_ORIGIN, type BookedPlace } from '../lib/place-book'

interface StopMapButtonProps {
  item: ScheduleItem
  destination: string
  /** 上一活动站；null/缺省 = 第一站，用 R1 固定出发点。 */
  from?: ScheduleItem | null
  /** 是否在高德按钮下渲染逐站复制地址按钮（倒计时地址行自带复制，传 false 避免重复）。 */
  showCopy?: boolean
}

export default function StopMapButton({ item, destination, from = null, showCopy = true }: StopMapButtonProps) {
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const copyTimer = useRef<number | null>(null)
  useEffect(() => () => {
    if (copyTimer.current != null) window.clearTimeout(copyTimer.current)
  }, [])

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

  const address = item.address?.trim() || lookupPlaceAddress(item.name)
  const copy = () => {
    if (address == null) return
    setCopyFailed(false)
    copyText(address)
      .then(() => {
        // 瞬时反馈：图标变勾+变色，1.2s 后复原；文案与尺寸恒定。
        setCopied(true)
        if (copyTimer.current != null) window.clearTimeout(copyTimer.current)
        copyTimer.current = window.setTimeout(() => setCopied(false), 1200)
      })
      .catch(() => setCopyFailed(true))
  }

  return (
    <div className="stop-actions">
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
      {showCopy && (
        <button
          type="button"
          className={`addr-copy${copied ? ' copied' : ''}`}
          onClick={copy}
          disabled={address == null}
          title={address == null ? '地址待确认' : `复制 ${item.name} 的地址`}
        >
          <Icon name={copied ? 'check' : 'copy'} className="sm" /> 复制地址
        </button>
      )}
      {showCopy && copyFailed && <span className="act-map-error">复制失败</span>}
    </div>
  )
}
