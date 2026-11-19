/**
 * Per-activity cost for the 「我的方案」 sub-line.
 *
 * The main-plan API carries one trip-level `costPerPersonCents` and no per-stop amount, so the
 * timeline previously hard-coded 「免费」 for every stop — a claim it could not support. This
 * module resolves a per-stop amount instead:
 *
 *  1. an explicit amount from the split snapshot (`PlanStop.costCents` / `RouteActivity.costCents`)
 *     always wins, because it is what the backend actually stored;
 *  2. otherwise the simulated Zhuhai / Hong Kong demo trips fall back to the mock book below,
 *     so the seeded itineraries read realistically before per-stop costs exist server-side;
 *  3. anything else returns `null` — the timeline then omits the amount rather than inventing
 *     「免费」.
 */

/** Mock per-person cost in cents for the simulated destinations (HKD / CNY as noted). */
const MOCK_COST_CENTS: Record<string, number> = {
  // 香港（HKD）
  '西九文化区 M+ 博物馆': 12000,
  '天星小轮（尖沙咀 → 中环）': 400,
  '中环街市与半山扶梯': 0,
  '太平山顶与凌霄阁': 8800,
  '铜锣湾时代广场': 0,
  '尖沙咀海滨长廊与星光大道': 0,
  '维多利亚港': 0,
  '太平山顶': 8800,
  '旺角': 0,
  '尖沙咀': 0,
  '星光大道': 0,
  '香港迪士尼乐园': 63900,
  // 珠海（CNY）
  '港珠澳大桥珠海公路口岸': 0,
  '日月贝（珠海大剧院）': 4000,
  '爱情邮局': 0,
  '情侣路': 0,
  '圆明新园': 6000,
  '珠海长隆海洋王国': 35000,
  '野狸岛': 0,
  '珠海星湾飞行营地': 248800,
  '海泉湾渔人码头': 0,
  '湾仔海鲜街': 0,
}

/**
 * Resolve one stop's per-person cost. `stored` (from the API) wins when it is a real number;
 * the mock book only fills gaps for the simulated cities.
 */
export function activityCostCents(name: string, stored?: number | null): number | null {
  if (stored != null && Number.isFinite(stored) && stored >= 0) return stored
  const mock = MOCK_COST_CENTS[name]
  return mock ?? null
}

/** Currency symbol follows the trip destination, matching the main-plan page. */
export function currencySymbol(destination?: string | null): string {
  const value = destination ?? ''
  if (/香港|hong\s*kong/i.test(value)) return 'HK$'
  if (/伦敦|london/i.test(value)) return '£'
  if (/新加坡|singapore/i.test(value)) return 'S$'
  return '¥'
}

/**
 * One readable cost label: 「免费」 for zero, `HK$120` etc. otherwise, and `null` when the
 * amount is unknown so the caller can drop the claim entirely.
 */
export function formatActivityCost(cents: number | null | undefined, destination?: string | null): string | null {
  if (cents == null) return null
  if (cents === 0) return '免费'
  const amount = cents / 100
  const rendered = Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
  return `${currencySymbol(destination)}${rendered}`
}