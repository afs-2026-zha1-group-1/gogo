const LEADING_MAINLINE = /^主线\s*[·•・:：-]\s*/

/** Station names are user-owned; the generated "主线·" marker is presentation noise, never part of the name. */
export function cleanStationName(name: string | null | undefined): string {
  const value = (name ?? "").trim()
  if (!value) return ""
  const cleaned = value.replace(LEADING_MAINLINE, "").trim()
  return cleaned || value
}

/** Cleans each side of an "A → B" route name so legacy documents also render without the marker. */
export function cleanRouteName(name: string | null | undefined): string {
  return (name ?? "")
    .split(" → ")
    .map((part) => cleanStationName(part))
    .filter(Boolean)
    .join(" → ")
}
