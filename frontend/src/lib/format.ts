/**
 * Display-only formatters for the split screens. The backend is the single source of truth for times,
 * windows and feasibility; these helpers only render the values it returns (no client-side judgment).
 * Stop instants are ISO-8601 UTC; clocks render in the trip's destination zone.
 */
import { tripZone } from './trip-zone.ts'

/** Render an ISO instant as HH:MM in the trip's local zone, or an em dash when absent/invalid. */
export function formatClock(iso: string | null | undefined, destination?: string | null): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tripZone(destination),
  }).format(date)
}

/** Human window length: 120 -> "2 小时", 150 -> "2 小时 30 分", 45 -> "45 分". */
export function formatWindow(minutes: number | null | undefined): string {
  if (minutes == null) return "—"
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours > 0 && rest > 0) return `${hours} 小时 ${rest} 分`
  if (hours > 0) return `${hours} 小时`
  return `${rest} 分`
}

/** Shorten a member UUID for compact identity display (full value is still sent as X-Member-Id). */
export function shortId(id: string | null | undefined): string {
  if (!id) return "未设置"
  return id.length > 8 ? `${id.slice(0, 8)}…` : id
}

/**
 * Per-person activity cost in cents rendered with the trip's currency symbol (same convention as the main-plan
 * screen: 香港 / 伦敦 / 合肥 fixtures carry their own symbol, everything else is SGD).
 */
export function formatCost(cents: number | null | undefined, destination?: string | null): string {
  if (cents == null) return "—"
  const value = destination ?? ""
  const symbol = /香港|hong\s*kong/i.test(value)
    ? "HK$"
    : /伦敦|london/i.test(value)
      ? "£"
      : /合肥|hefei/i.test(value)
        ? "¥"
        : "S$"
  const major = cents / 100
  return `${symbol}${Number.isInteger(major) ? major : major.toFixed(2)}`
}

/** A stored member budget (major units) labelled with its own ISO currency code. */
export function formatBudget(amount: number | null | undefined, currency?: string | null): string {
  if (amount == null) return "未设置"
  return `${currency ?? ""} ${amount}`.trim()
}