/**
 * US-079 路线1：生成/重新生成后给缺坐标的站异步查坐标并回写存库（沉淀 place_cache）。
 * AI 生成的站只有名字没有地址，用「站名+目的地城市」作地理编码关键词；
 * 海外站高德查不到，留空走兜底（地址簿/搜索页）。失败静默，不阻塞页面。
 */
import { api } from '../api'
import { geocodeAddress } from './amap-geocode'
import { geocodeKeyword } from './amap.ts'
import type { PlanStop } from '../types/mainPlan'

/** 回写成功返回 true，调用方据此刷新方案拿到坐标与地址。仅组织者草稿态可调（端点门序）。 */
export async function completeStopLocations(
  tripId: number,
  stops: PlanStop[],
  destination: string,
): Promise<boolean> {
  // 缺坐标或缺地址都补：AI 站只有名字，地址要靠地理编码的 formattedAddress 带出。
  const pending = stops.filter((stop) => stop.lat == null || stop.lng == null || !stop.address?.trim())
  if (pending.length === 0) return false
  const located: Array<{ seq: number; lat: number; lng: number; address: string | null }> = []
  for (const stop of pending) {
    const point = await geocodeAddress(geocodeKeyword(stop, destination), destination)
    if (point) located.push({ seq: stop.seq, lat: point.lat, lng: point.lon, address: point.address })
  }
  if (located.length === 0) return false
  const result = await api(`/api/trips/${tripId}/main-plan/stop-locations`, {
    method: 'POST',
    body: { stops: located },
  })
  return result.ok
}