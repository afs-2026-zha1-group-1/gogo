/**
 * Multi-day timeline helpers. dayIndex 1 = trip start date; every day groups
 * the items that belong to that calendar date in the device-local timezone.
 */

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

/** `YYYY-MM-DD` of `dayIndex` within the trip (1 = startDate). */
export function dayDate(startDate: string, dayIndex: number): string {
  const [year, month, day] = startDate.split('-').map(Number)
  const date = new Date(year, month - 1, day + Math.max(0, dayIndex - 1))
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** `M/D`, compact enough for a day tab. */
export function shortDayLabel(startDate: string, dayIndex: number): string {
  const [, month, day] = dayDate(startDate, dayIndex).split('-').map(Number)
  return `${month}/${day}`
}

/** `周X` of a trip day. */
export function weekdayLabel(startDate: string, dayIndex: number): string {
  const [year, month, day] = dayDate(startDate, dayIndex).split('-').map(Number)
  return `周${WEEKDAYS[new Date(year, month - 1, day).getDay()]}`
}

/** `DAY N · M月D日（周X）`, matching the existing timeline label. */
export function dayLabel(startDate: string, dayIndex: number): string {
  const [, month, day] = dayDate(startDate, dayIndex).split('-').map(Number)
  return `DAY ${dayIndex} · ${month}月${day}日（${weekdayLabel(startDate, dayIndex)}）`
}

/** Day index of an instant relative to the trip start; an unknown time keeps day 1. */
export function dayIndexOfInstant(start: number | null, startDate: string): number {
  if (start == null) return 1
  const [year, month, day] = startDate.split('-').map(Number)
  const base = Date.UTC(year, month - 1, day)
  const date = new Date(start)
  const instant = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.max(1, Math.round((instant - base) / 86_400_000) + 1)
}

export interface DayGroup<T> {
  dayIndex: number
  items: T[]
}

/**
 * Tab shown on first render: today when it has a page, the last page after the
 * trip, the first page before it or when today's data is missing.
 */
export function defaultDayIndex(availableDays: number[], todayDay: number): number | undefined {
  if (availableDays.length === 0) return undefined
  if (availableDays.includes(todayDay)) return todayDay
  const last = availableDays[availableDays.length - 1]
  return todayDay > last ? last : availableDays[0]
}

/** Groups in ascending day order; the items keep their incoming order. */
export function groupByDay<T>(items: T[], dayOf: (item: T) => number): DayGroup<T>[] {
  const groups = new Map<number, T[]>()
  for (const item of items) {
    const dayIndex = Math.max(1, dayOf(item))
    const group = groups.get(dayIndex)
    if (group) group.push(item)
    else groups.set(dayIndex, [item])
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([dayIndex, dayItems]) => ({ dayIndex, items: dayItems }))
}
