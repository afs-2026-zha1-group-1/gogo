/**
 * US-079: 演示站点地址簿（地址文字 + 真实 WGS-84 坐标）。坐标只用于拼高德
 * 路线网址（路线页只认坐标不认名字，实测登录也不认）；地址文字供展示/复制。
 * 名称与 scripts/demo-seed.py、FakeMainPlanProvider 及用户演示行程逐字对齐；
 * 未收录站点退回搜索页（目的地自动带出、起点手填）。
 */

export interface BookedPlace {
  lat: number
  lon: number
  address: string
}

/** US-079 R1（用户 2026-11-18 裁决）：首站统一固定出发点。 */
export const FIRST_STOP_ORIGIN = '珠海南方软件园'

const BOOK: Record<string, BookedPlace> = {
  // 首站固定出发点（WGS-84，由高德 POI GCJ 22.372424,113.577651 反算，往返误差<1m）
  '珠海南方软件园': { lat: 22.375463, lon: 113.572607, address: '珠海市香洲区唐家湾镇软件园路1号南方软件园' },
  // 新加坡（种子行程 1 / FakeMainPlanProvider 固定四站）
  'City Hall MRT': { lat: 1.2931, lon: 103.852, address: '150 North Bridge Rd, Singapore 179100' },
  'National Gallery Singapore': { lat: 1.2902, lon: 103.8515, address: "1 St Andrew's Rd, Singapore 179097" },
  'National Gallery': { lat: 1.2902, lon: 103.8515, address: "1 St Andrew's Rd, Singapore 179097" },
  'Gardens by the Bay': { lat: 1.2816, lon: 103.8636, address: '18 Marina Gardens Dr, Singapore 018953' },
  'Merlion Park': { lat: 1.2868, lon: 103.8545, address: '1 Fullerton Rd, Singapore 049213' },
  // 香港（demo-seed HONG_KONG_MAIN；中文地址与中文站名对应）
  '西九文化区 M+ 博物馆': { lat: 22.3009, lon: 114.1595, address: '香港西九文化区博物馆道 38 号 M+ 博物馆' },
  '天星小轮（尖沙咀 → 中环）': { lat: 22.2936, lon: 114.1696, address: '香港尖沙咀天星码头（乘船往中环天星码头）' },
  '中环街市与半山扶梯': { lat: 22.2837, lon: 114.1555, address: '香港中环皇后大道中 93 号中环街市 / 中环半山扶梯' },
  '中环至半山自动扶梯': { lat: 22.2836, lon: 114.1552, address: '香港中环皇后大道中 93 号中环街市 / 中环半山扶梯' },
  '太平山顶与凌霄阁': { lat: 22.2714, lon: 114.1499, address: '香港山顶山顶道 128 号凌霄阁' },
  '铜锣湾时代广场': { lat: 22.2783, lon: 114.1822, address: '香港铜锣湾勿地臣街 1 号时代广场' },
  '尖沙咀海滨长廊与星光大道': { lat: 22.293, lon: 114.174, address: '香港尖沙咀海滨长廊 / 星光大道' },
  // 珠海（用户演示行程）
  '港珠澳大桥珠海公路口岸': { lat: 22.2216, lon: 113.558, address: '珠海市香洲区港珠澳大桥珠海公路口岸' },
  // 伦敦（demo-seed LONDON_MAIN；中文场所名 + 当地地址）
  '大英博物馆': { lat: 51.5194, lon: -0.127, address: '伦敦大罗素街大英博物馆（Great Russell St, WC1B 3DG）' },
  '考文特花园': { lat: 51.512, lon: -0.122, address: '伦敦考文特花园市集（Covent Garden, WC2E 8RF）' },
  '国家美术馆与特拉法加广场': { lat: 51.5089, lon: -0.1283, address: '伦敦特拉法加广场国家美术馆（WC2N 5DN）' },
  '博罗市场午餐': { lat: 51.5055, lon: -0.091, address: '伦敦南华克街 8 号博罗市场（8 Southwark St, SE1 1TL）' },
  '伦敦塔与塔桥': { lat: 51.5081, lon: -0.0759, address: '伦敦塔桥路伦敦塔（Tower Bridge Rd, SE1 2UP）' },
  '泰晤士河游船（塔桥 → 威斯敏斯特）': { lat: 51.5053, lon: -0.0753, address: '伦敦塔桥千禧码头（Tower Millennium Pier, SE1 2UP）' },
  '伦敦眼与南岸夜景': { lat: 51.5033, lon: -0.1196, address: '伦敦南岸郡政厅伦敦眼（County Hall, SE1 7PB）' },
}

/** 站点名精确命中（地址+坐标）；null = 未收录，调用方退回搜索页。 */
export function lookupPlaceBook(name: string): BookedPlace | null {
  return BOOK[name] ?? null
}

/** 只取地址文字（展示/复制用）。 */
export function lookupPlaceAddress(name: string): string | null {
  return BOOK[name]?.address ?? null
}
