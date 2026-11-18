/**
 * US-079: WGS-84 → GCJ-02 纠偏（高德国内坐标加偏，海外不偏）。地址簿存真实
 * WGS-84 坐标，拼高德网址时国内点先纠偏，否则起点/终点会偏几百米导错路。
 * 经典公开算法；outOfChina 判定之外原样返回。
 */

const PI = Math.PI
const A = 6378245.0
const EE = 0.00669342162296594323

export function outOfChina(lat: number, lon: number): boolean {
  //  mainland 纬度下限取 18°（海南以南），避免把新加坡等东南亚点框进国内。
  return lon < 72.004 || lon > 137.8347 || lat < 18.0 || lat > 55.8271
}

/** 港澳用真实坐标（GCJ-02 只适用 mainland），单独排除；珠海口岸在排除框外。 */
function inHkMacau(lat: number, lon: number): boolean {
  const hk = lat >= 22.15 && lat <= 22.6 && lon >= 113.8 && lon <= 114.5
  const macau = lat >= 22.1 && lat <= 22.22 && lon >= 113.53 && lon <= 113.6
  return hk || macau
}

function transformLat(x: number, y: number): number {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0
  ret += ((160.0 * Math.sin((y / 12.0) * PI) + 320 * Math.sin((y * PI) / 30.0)) * 2.0) / 3.0
  return ret
}

function transformLon(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0
  ret += ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) * 2.0) / 3.0
  return ret
}

/** 纯偏移量计算（不做国内外/港澳判定）；供正纠偏与反解共用。 */
function shift(lat: number, lon: number): { dLat: number; dLon: number } {
  let dLat = transformLat(lon - 105.0, lat - 35.0)
  let dLon = transformLon(lon - 105.0, lat - 35.0)
  const radLat = (lat / 180.0) * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI)
  dLon = (dLon * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI)
  return { dLat, dLon }
}

/** 国内点纠偏为高德坐标；海外及港澳点原样返回。 */
export function toGcj02(lat: number, lon: number): { lat: number; lon: number } {
  if (outOfChina(lat, lon) || inHkMacau(lat, lon)) return { lat, lon }
  const { dLat, dLon } = shift(lat, lon)
  return { lat: lat + dLat, lon: lon + dLon }
}

/**
 * GCJ-02 → WGS-84 反解（迭代逼近，收敛到厘米级）：高德 JS API 查到的坐标
 * 是 GCJ-02，落库前必须反解回真实 WGS-84，否则拼网址时再纠偏会双重加偏。
 * 港澳判定用粗估 WGS 位置：珠海等紧邻港澳的国内点加偏后会落进排除框，
 * 按输入点判会误当港澳原样返回（实测珠海点因此反解失败）。海外点原样返回。
 */
export function fromGcj02(lat: number, lon: number): { lat: number; lon: number } {
  if (outOfChina(lat, lon)) return { lat, lon }
  const s0 = shift(lat, lon)
  if (inHkMacau(lat - s0.dLat, lon - s0.dLon)) return { lat, lon }
  let wLat = lat
  let wLon = lon
  for (let i = 0; i < 30; i++) {
    const s = shift(wLat, wLon)
    const dLat = wLat + s.dLat - lat
    const dLon = wLon + s.dLon - lon
    wLat -= dLat
    wLon -= dLon
    if (Math.abs(dLat) < 1e-9 && Math.abs(dLon) < 1e-9) break
  }
  return { lat: wLat, lon: wLon }
}
