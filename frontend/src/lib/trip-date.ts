/** US-071 F3: pure date helpers for the trip list, unit-tested with node:test (no extra deps). */

/** Both sides are `YYYY-MM-DD`, so lexical order is date order. */
export function isEnded(endDate: string, today: string): boolean {
  return endDate < today
}

/** Local-date `YYYY-MM-DD`; `now` is injectable for tests. */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
