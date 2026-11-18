/**
 * Pure view-model for the Screen 11 team-route graph (US-086). No React, no fetch: the screen maps
 * backend `SplitDraftDetail` / `MainPlan` into these inputs, and both the SVG component and the
 * node:test suite consume the same functions. Branch rows are derived from the existing
 * GroupRoute fields only (activity name/minutes, travel legs, buffer); nothing is invented.
 */

import { tripZone } from "../../lib/trip-zone.ts"

export type RouteKey = "a" | "b"
export type LabelSide = "left" | "right"

export interface StopInput {
  id: string
  name: string
  startLabel: string
  endLabel: string
}

export interface RouteInput {
  groupLabel: string
  activityName: string | null
  /** Editable display location (US-087); shown when it differs from the activity name. */
  locationName?: string | null
  activityMinutes: number | null
  travelLegsMinutes: (number | null)[]
  bufferMinutes: number | null
  /** Main-plan steps for the group that keeps the confirmed itinerary (backend RouteStep). */
  steps?: { name: string; minutes: number }[] | null
}

export interface MainRow {
  kind: "main"
  id: string
  title: string
  meta: string
  side: LabelSide
}

export interface JunctionRow {
  kind: "fork" | "join"
  id: string
  title: string
  meta: string
  side: LabelSide
}

export interface BranchRow {
  kind: "branch"
  id: string
  route: RouteKey
  title: string
  meta: string
}

export type GraphRow = MainRow | JunctionRow | BranchRow

export interface GraphModel {
  rows: GraphRow[]
  forkRow: number | null
  joinRow: number | null
  routeLabels: Record<RouteKey, string>
}

export const PENDING_LABEL = "待补全"

/** Approximate-width truncation for SVG labels (full-width chars count 1, ASCII 0.55). */
export function truncateLabel(text: string, maxUnits: number): string {
  let units = 0
  let result = ""
  for (const char of text) {
    const width = /[\u3000-\u9fff\uff00-\uffef]/.test(char) ? 1 : 0.55
    if (units + width > maxUnits - 1) return `${result.trimEnd()}…`
    units += width
    result += char
  }
  return text
}

/** ISO timestamps (draft snapshot) and local HH:MM (main-plan stops) are formatted separately, never converted. */
export function formatTime(
  value: string | null | undefined,
  source: "iso" | "local",
  destination?: string | null,
): string {
  if (value == null || value === "") return PENDING_LABEL
  if (source === "local") return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tripZone(destination),
  }).format(date)
}

export function formatMinutes(minutes: number | null | undefined): string {
  return minutes == null ? PENDING_LABEL : `${minutes} 分钟`
}

export function routeKeyFor(groupLabel: string, index: number): RouteKey {
  const lower = groupLabel.trim().toLowerCase()
  if (lower.includes("b")) return "b"
  if (lower.includes("a")) return "a"
  return index === 1 ? "b" : "a"
}

export function routeLabelsFor(routes: RouteInput[]): Record<RouteKey, string> {
  const labels: Record<RouteKey, string> = { a: "Route A", b: "Route B" }
  routes.forEach((route, index) => {
    const key = routeKeyFor(route.groupLabel, index)
    const name = route.activityName?.trim()
    labels[key] = name ? `Route ${key.toUpperCase()} · ${name}` : `Route ${key.toUpperCase()}`
  })
  return labels
}

/** Appends the edited location only when it adds information beyond the activity name (US-087 D-2). */
function locationSuffix(route: RouteInput): string {
  const location = route.locationName?.trim()
  const activity = route.activityName?.trim()
  return location && location !== activity ? ` · ${location}` : ""
}

/** One route's branch nodes in travel order: places and legs alternate; zero buffer is omitted. */
function branchRowsFor(route: RouteInput, key: RouteKey): BranchRow[] {
  const steps = route.steps ?? []
  const legs = route.travelLegsMinutes
  const rows: BranchRow[] = []
  const pushLeg = (legIndex: number) => {
    if (legIndex < 0 || legIndex >= legs.length) return
    const minutes = legs[legIndex]
    rows.push({
      kind: "branch",
      id: `${key}-leg-${legIndex}`,
      route: key,
      title: "路程",
      meta: minutes == null ? `路程 · ${PENDING_LABEL}` : `路程 · ${minutes} 分钟`,
    })
  }
  if (steps.length > 0) {
    // Group B starts with the outbound trip; group A starts at the departure stop itself.
    if (key === "b") pushLeg(0)
    steps.forEach((step, index) => {
      rows.push({
        kind: "branch",
        id: `${key}-step-${index}`,
        route: key,
        title: step.name,
        meta: `活动 · ${formatMinutes(step.minutes)}`,
      })
      pushLeg(key === "b" ? index + 1 : index)
    })
  } else {
    // Legacy single-activity documents (pre Revision 3): keep one activity row around its legs.
    if (key === "b") pushLeg(0)
    rows.push({
      kind: "branch",
      id: `${key}-activity`,
      route: key,
      title: route.activityName?.trim() || "活动",
      meta: `活动 · ${formatMinutes(route.activityMinutes)}${locationSuffix(route)}`,
    })
    const start = key === "b" ? 1 : 0
    for (let index = start; index < legs.length; index += 1) pushLeg(index)
  }
  if (route.bufferMinutes !== 0) {
    rows.push({
      kind: "branch",
      id: `${key}-buffer`,
      route: key,
      title: "缓冲",
      meta: `缓冲 · ${formatMinutes(route.bufferMinutes)}`,
    })
  }
  return rows
}

/** Interleave A/B step by step so the two lanes advance together: A活动, B活动, A路程, B路程, ... */
export function buildBranchRows(routes: RouteInput[]): BranchRow[] {
  const byKey: Record<RouteKey, BranchRow[]> = { a: [], b: [] }
  routes.forEach((route, index) => {
    const key = routeKeyFor(route.groupLabel, index)
    byKey[key] = branchRowsFor(route, key)
  })
  const max = Math.max(byKey.a.length, byKey.b.length)
  const rows: BranchRow[] = []
  for (let step = 0; step < max; step += 1) {
    if (byKey.a[step]) rows.push(byKey.a[step])
    if (byKey.b[step]) rows.push(byKey.b[step])
  }
  return rows
}

function mainRow(stop: StopInput, counter: number): MainRow {
  const meta = stop.startLabel === stop.endLabel ? stop.startLabel : `${stop.startLabel} – ${stop.endLabel}`
  return {
    kind: "main",
    id: stop.id,
    title: stop.name,
    meta,
    side: counter % 2 === 0 ? "right" : "left",
  }
}

/**
 * Builds the full graph. When both boundaries resolve inside the main line, the main line is split
 * into before / fork / branches / join / after; otherwise only the main line is returned.
 */
export function buildGraphRows(input: {
  stops: StopInput[]
  departureStopId: string | null
  reunionStopId: string | null
  routes: RouteInput[]
}): GraphModel {
  const { stops, departureStopId, reunionStopId, routes } = input
  const forkIndex = departureStopId ? stops.findIndex((stop) => stop.id === departureStopId) : -1
  const joinIndex = reunionStopId ? stops.findIndex((stop) => stop.id === reunionStopId) : -1
  const routeLabels = routeLabelsFor(routes)

  if (forkIndex < 0 || joinIndex < 0 || forkIndex >= joinIndex) {
    return {
      rows: stops.map((stop, index) => mainRow(stop, index)),
      forkRow: null,
      joinRow: null,
      routeLabels,
    }
  }

  const rows: GraphRow[] = []
  let mainCounter = 0
  for (let index = 0; index < forkIndex; index += 1) {
    rows.push(mainRow(stops[index], mainCounter))
    mainCounter += 1
  }
  const fork = stops[forkIndex]
  const forkRow = rows.length
  rows.push({
    kind: "fork",
    id: fork.id,
    title: fork.name,
    meta: `${fork.startLabel} · 分头`,
    side: "right",
  })

  const branches = buildBranchRows(routes)
  rows.push(...branches)

  const join = stops[joinIndex]
  const joinRow = rows.length
  rows.push({
    kind: "join",
    id: join.id,
    title: join.name,
    meta: `${join.startLabel} · 会合`,
    side: "left",
  })

  for (let index = joinIndex + 1; index < stops.length; index += 1) {
    rows.push(mainRow(stops[index], mainCounter))
    mainCounter += 1
  }

  return { rows, forkRow, joinRow, routeLabels }
}

export interface StatusAction {
  kind: "start" | "boundaries" | "confirm" | "blocked"
  label: string
}

export function actionForStatus(
  status: "active" | "confirmed" | "cancelled" | null,
  hasConfirmedMainPlan: boolean,
): StatusAction {
  if (status === "active") return { kind: "boundaries", label: "继续分队" }
  if (status === "confirmed") return { kind: "confirm", label: "查看已确认分队" }
  if (!hasConfirmedMainPlan) return { kind: "blocked", label: "发起分队" }
  return { kind: "start", label: "发起分队" }
}
