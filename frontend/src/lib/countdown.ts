/**
 * US-085: pure countdown state machine for the trip detail card (design DD-2/DD-4).
 * Times are epoch ms in the device-local timezone (MVP assumption D-2); `now` is
 * injectable so node:test can exercise boundaries without timers.
 */

/** One timeline entry shared by the countdown and the 我的方案 section (design DD-2). */
export interface ScheduleItem {
  key: string
  // Set only for main-plan stops: the stop a「我的方案」edit targets (US-090).
  stopId?: number
  /** 分队节点：分组路线的某个步骤，编辑后写回该轮 routes 并刷新路线图。 */
  splitStep?: { roundIndex: number; groupLabel: string; stepIndex: number; minutes: number }
  name: string
  // 站点备注（主线站可编辑）；null/省略 = 无备注，时间线不额外展示说明。
  note?: string | null
  /** Shared split junction at a specific instant, rather than an activity interval. */
  kind?: 'split-departure'
  /** Multi-day plan: 1 = trip start date; omitted entries derive it from `start`. */
  dayIndex?: number
  /** epoch ms; null = time pending confirmation (never fabricated). */
  start: number | null
  end: number | null
  /** null = shared activity for every member. */
  groupLabel: string | null
  /** 单人费用（分）；null = 未知，时间线不展示金额（不伪造「免费」）。 */
  costCents?: number | null
  /** US-096: split round this entry belongs to; absent for shared/main entries. */
  roundIndex?: number
  interests: string[]
  address: string | null
  /** US-079 路线1：落库坐标（WGS-84）；null = 未补全，导航退回地址簿/搜索页。 */
  lat: number | null
  lon: number | null
  travelMinutesToNext: number | null
}

export type CountdownState =
  | { kind: 'pre-trip'; target: number; remainingMs: number }
  | { kind: 'during'; item: ScheduleItem; remainingMs: number }
  | { kind: 'between'; next: ScheduleItem; remainingMs: number }
  | { kind: 'finished' }
  | { kind: 'no-schedule' }

/** Local midnight of a `YYYY-MM-DD` trip date (departure instant, R7). */
export function localMidnight(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 0, 0, 0, 0).getTime()
}

/** Last instant of a `YYYY-MM-DD` trip date (trip-end boundary). */
export function localEndOfDay(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime()
}

/**
 * Resolve the countdown state for `now` (R7). Activities use half-open intervals
 * [start, end) so hitting an end boundary switches state instead of going negative;
 * items with unknown times never participate in during/between decisions.
 */
export function resolveCountdown(
  now: number,
  departureMs: number,
  schedule: ScheduleItem[],
  tripEndMs: number,
): CountdownState {
  if (now < departureMs) return { kind: 'pre-trip', target: departureMs, remainingMs: departureMs - now }

  const timed = schedule
    .filter((item): item is ScheduleItem & { start: number; end: number } =>
      item.start != null && item.end != null)
    .sort((a, b) => a.start - b.start)

  for (const item of timed) {
    if (now >= item.start && now < item.end) {
      return { kind: 'during', item, remainingMs: item.end - now }
    }
  }
  const next = timed.find((item) => item.start > now)
  if (next) return { kind: 'between', next, remainingMs: next.start - now }
  if (timed.length > 0) return { kind: 'finished' }
  return now > tripEndMs ? { kind: 'finished' } : { kind: 'no-schedule' }
}

/** Split a non-negative duration into `N 天 HH:MM:SS` parts; negatives clamp to zero. */
export function formatCountdown(ms: number): { days: number; hh: string; mm: string; ss: string } {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const pad = (value: number) => String(value).padStart(2, '0')
  return {
    days,
    hh: pad(Math.floor((total % 86400) / 3600)),
    mm: pad(Math.floor((total % 3600) / 60)),
    ss: pad(total % 60),
  }
}

/** Local `HH:mm` clock label for an epoch-ms instant (timeline / next-stop display). */
export function formatClock(ms: number): string {
  const date = new Date(ms)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Visual state of one timeline stop, derived from the resolved countdown state. */
export type StopState = 'current' | 'next' | 'done' | 'upcoming'

/**
 * US-083 presentation only: maps a schedule item to how the timeline should read.
 * The business rule (which stop is running / next) stays in `resolveCountdown`; this
 * only labels the same truth for the rail, the badge and the card surface.
 */
export function stopVisualState(item: ScheduleItem, state: CountdownState): StopState {
  const currentKey = state.kind === 'during' ? state.item.key : null
  const nextKey = state.kind === 'between' ? state.next.key : null
  if (item.key === currentKey) return 'current'
  if (item.key === nextKey) return 'next'
  if (item.start == null || item.end == null) return 'upcoming'
  if (state.kind === 'finished') return 'done'
  // Anything already ended before the currently running activity counts as done.
  if (state.kind === 'during' && state.item.end != null && item.end <= state.item.end) return 'done'
  if (state.kind === 'between' && state.next.start != null && item.end <= state.next.start) return 'done'
  return 'upcoming'
}
