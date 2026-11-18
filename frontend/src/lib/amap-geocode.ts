/**
 * US-079 路线1：浏览器侧高德 JS API 地理编码（JS Key + 安全密钥，.env 注入）。
 * 只用于"生成落库后给缓存未命中的国内站查坐标回写"；海外地址高德查不了，
 * 返回 null 走兜底（地址簿/搜索页）。不参与展示与搜索词拼装。
 */
import { fromGcj02 } from './coord.ts'

interface GeocoderResult {
  geocodes?: Array<{
    location?: { lat: number; lng: number }
    formattedAddress?: string
    province?: string
    city?: string
  }>
}

/** 地理编码候选项的最小形状（供纯函数单测）。 */
export interface GeocodeCandidate {
  formattedAddress?: string
  province?: string
  city?: string
}

/**
 * 一名多地时不盲取第一个：只认落在目的地省/市/地址里的候选，取其中第一个；
 * 全不匹配返回 null（宁缺勿错，避免重庆的南山植物园存成深圳的）。
 * 目的地去掉行政后缀再比（“重庆” vs “重庆市”）。
 */
export function pickInDestination<T extends GeocodeCandidate>(geocodes: T[], destination: string): T | null {
  const core = destination.trim().replace(/(特别行政区|壮族自治区|回族自治区|维吾尔自治区|自治区|省|市)$/, '')
  if (!core) return geocodes[0] ?? null
  for (const candidate of geocodes) {
    const fields = [candidate.province, candidate.city, candidate.formattedAddress]
    if (fields.some((field) => typeof field === 'string' && field.includes(core))) return candidate
  }
  return null
}

interface AMapSdk {
  plugin: (names: string[], callback: () => void) => void
  Geocoder: new (options?: Record<string, unknown>) => {
    getLocation: (address: string, callback: (status: string, result: GeocoderResult) => void) => void
  }
}

declare global {
  interface Window {
    AMap?: AMapSdk
    _AMapSecurityConfig?: { securityJsCode: string }
  }
}

let loading: Promise<AMapSdk | null> | null = null

function loadAmap(): Promise<AMapSdk | null> {
  if (loading) return loading
  loading = new Promise((resolve) => {
    const key = import.meta.env.VITE_AMAP_KEY
    const security = import.meta.env.VITE_AMAP_SECURITY_JS_CODE
    if (!key || !security) {
      resolve(null)
      return
    }
    window._AMapSecurityConfig = { securityJsCode: security }
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}`
    const timer = setTimeout(() => resolve(null), 10_000)
    script.onload = () => {
      clearTimeout(timer)
      resolve(window.AMap ?? null)
    }
    script.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }
    document.head.appendChild(script)
  })
  return loading
}

/**
 * 地址→WGS-84 坐标 + 真实地址；无 Key/加载失败/查不到/超时均返回 null。
 * 多结果取第一个；传 city 把搜索限定在目的地城市，避免“南山”这类歧义名
 * 的首个结果落在别的城市（实测曾把重庆南山解到深圳）。
 * 高德返回 GCJ-02，统一反解回 WGS-84 再交给调用方落库/拼网址；
 * formattedAddress 一并带出供回写展示/复制（AI 站只有名字没有地址）。
 */
export async function geocodeAddress(
  address: string,
  city?: string,
): Promise<{ lat: number; lon: number; address: string | null } | null> {
  const sdk = await loadAmap()
  if (!sdk) return null
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 8_000)
    sdk.plugin(['AMap.Geocoder'], () => {
      const geocoder = new sdk.Geocoder(city ? { city } : undefined)
      geocoder.getLocation(address, (status, result) => {
        clearTimeout(timer)
        const geocode = status === 'complete'
          ? pickInDestination(result.geocodes ?? [], city ?? '')
          : undefined
        const location = geocode?.location
        if (!location) {
          resolve(null)
          return
        }
        const point = fromGcj02(location.lat, location.lng)
        const real = geocode?.formattedAddress?.trim()
        resolve({ lat: point.lat, lon: point.lon, address: real || null })
      })
    })
  })
}
