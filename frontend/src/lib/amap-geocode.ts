/**
 * US-079 路线1：浏览器侧高德 JS API 地理编码（JS Key + 安全密钥，.env 注入）。
 * 只用于"生成落库后给缓存未命中的国内站查坐标回写"；海外地址高德查不了，
 * 返回 null 走兜底（地址簿/搜索页）。不参与展示与搜索词拼装。
 */

interface GeocoderResult {
  geocodes?: Array<{ location?: { lat: number; lng: number } }>
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

/** 地址→WGS-84 坐标；无 Key/加载失败/查不到/超时均返回 null（多结果取第一个）。 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  const sdk = await loadAmap()
  if (!sdk) return null
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 8_000)
    sdk.plugin(['AMap.Geocoder'], () => {
      const geocoder = new sdk.Geocoder()
      geocoder.getLocation(address, (status, result) => {
        clearTimeout(timer)
        const location = status === 'complete' ? result.geocodes?.[0]?.location : undefined
        resolve(location ? { lat: location.lat, lon: location.lng } : null)
      })
    })
  })
}
