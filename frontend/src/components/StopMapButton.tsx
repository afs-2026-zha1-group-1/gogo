/**
 * US-079: 高德按钮 = 真链接，新开标签页进高德完整页面做导航（嵌入方式已废除）。
 * 每次点开都必须带起点和终点：路线页只认坐标，缺坐标的端点在点击时现查高德
 * （一名多地取第一个结果）；起点=上一站，首站或上一站查不到时固定珠海南方软件园（R1）。
 * 仅当终点坐标实在查不到（如海外站）才退搜索页。当前标签页停留在行程详情。
 * 右列布局：高德按钮顶对齐左侧站点图标，其下为逐站“复制地址”按钮（showCopy 可控）。
 */
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import Icon from '../Icons'
import {
  buildAmapDirUrl,
  defaultDirOrigin,
  geocodeKeyword,
  resolveDirEnd,
  stopMapHref,
  type MapStop,
} from '../lib/amap'
import { geocodeAddress } from '../lib/amap-geocode'
import { copyText } from '../lib/clipboard'
import { lookupPlaceAddress } from '../lib/place-book'

/** 导航所需的最小站点形状：时间轴 ScheduleItem 与方案页 PlanStop 映射后均可传入。 */
type MapItem = MapStop & { address?: string | null }

interface StopMapButtonProps {
  item: MapItem
  destination: string
  /** 上一活动站；null/缺省 = 第一站，用 R1 固定出发点。 */
  from?: MapItem | null
  /** 是否在高德按钮下渲染逐站复制地址按钮（倒计时地址行自带复制，传 false 避免重复）。 */
  showCopy?: boolean
}

export default function StopMapButton({ item, destination, from = null, showCopy = true }: StopMapButtonProps) {
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  // 点击现查坐标时顺带拿到的真实地址：落库刷新前先供复制按钮就地可用。
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const copyTimer = useRef<number | null>(null)
  useEffect(() => () => {
    if (copyTimer.current != null) window.clearTimeout(copyTimer.current)
  }, [])
  useEffect(() => setResolvedAddress(null), [item.name])

  const { href, originName } = stopMapHref(item, from, destination)
  const title = originName != null ? `从 ${originName} 出发` : '高德导航'

  // 任一端点缺坐标：点击时先同步开空白标签页（保住用户手势不被弹窗拦截），
  // 现查坐标补齐起终点后再跳转；即使查不到坐标也仍然进路线页（用名称定位），
  // 不会退化成没有起终点的搜索页。
  const needsGeocode = resolveDirEnd(item) == null || (from != null && resolveDirEnd(from) == null)
  async function openWithCoords(event: MouseEvent<HTMLAnchorElement>) {
    if (!needsGeocode) return
    event.preventDefault()
    const win = window.open('', '_blank')
    if (win) {
      // 手写开页绕过了 <a rel=noopener>，手动切断 opener 防止高德页反向访问本页。
      win.opener = null
      win.document.write('<p style="font-family:sans-serif;padding:24px">正在查询地点坐标…</p>')
    }
    let to = resolveDirEnd(item)
    if (to == null) {
      const point = await geocodeAddress(geocodeKeyword(item, destination), destination)
      if (point) {
        to = { name: item.name, lat: point.lat, lon: point.lon }
        if (point.address) setResolvedAddress(point.address)
      }
    }
    let fromEnd = from != null ? resolveDirEnd(from) : null
    if (from != null && fromEnd == null) {
      const point = await geocodeAddress(geocodeKeyword(from, destination), destination)
      if (point) fromEnd = { name: from.name, lat: point.lat, lon: point.lon }
    }
    // 坐标查不到时用名称端点，保证起点和终点都在链接里。
    const toEnd = to ?? { name: geocodeKeyword(item, destination) }
    const fromResolved = fromEnd
      ?? (from != null ? { name: geocodeKeyword(from, destination) } : null)
      ?? defaultDirOrigin()
    const url = buildAmapDirUrl(fromResolved, toEnd)
    if (win) win.location.href = url
    else window.open(url, '_blank', 'noopener')
  }

  const address = item.address?.trim() || resolvedAddress || lookupPlaceAddress(item.name)
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
        onClick={openWithCoords}
        aria-label={originName != null ? `在高德中规划 ${originName} 到 ${item.name} 的路线` : `在高德中打开 ${item.name} 导航`}
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
