/**
 * Destination -> IANA zone for display only. The backend stores instants; split screens render them in the
 * trip's own wall clock so 伦敦 is not shown in Singapore time. Anything unknown keeps the Singapore default
 * the product shipped with.
 */
const DEFAULT_ZONE = "Asia/Singapore"

const ZONES: Array<{ pattern: RegExp; zone: string }> = [
  { pattern: /香港|hong\s*kong/i, zone: "Asia/Hong_Kong" },
  { pattern: /伦敦|london/i, zone: "Europe/London" },
]

export function tripZone(destination?: string | null): string {
  if (destination) {
    for (const { pattern, zone } of ZONES) {
      if (pattern.test(destination)) return zone
    }
  }
  return DEFAULT_ZONE
}
