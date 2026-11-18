/**
 * Pure view-model for the Screen 11 team-route graph (US-086). No React, no fetch: the screen maps
 * backend `SplitDraftDetail` / `MainPlan` into these inputs, and both the SVG component and the
 * node:test suite consume the same functions. Branch rows are derived from the existing
 * GroupRoute fields only (activity name/minutes, travel legs, buffer); nothing is invented.
 */

import { tripZone } from "../../lib/trip-zone.ts"
import { cleanRouteName, cleanStationName } from "./station-name.ts"
import type { SplitBoundaryMode } from "./types"

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

/** One stage with both lanes at the same height (US-095 FROM_START); either side may be empty. */
export interface BranchPairRow {
  kind: "branch-pair"
  id: string
  a: BranchRow | null
  b: BranchRow | null
}

export type GraphRow = MainRow | JunctionRow | BranchRow | BranchPairRow

export interface GraphModel {
  rows: GraphRow[]
  forkRow: number | null
  joinRow: number | null
  routeLabels: Record<RouteKey, string>
  /** True when a saved boundary shape exists (US-095: MIDDLE or FROM_START). */
  hasBoundaries: boolean
  /** FROM_START: two origin nodes instead of one fork node, i.e. both lanes start at the top (US-095). */
  fromStart: boolean
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
    const name = cleanRouteName(route.activityName)
    labels[key] = name ? `Route ${key.toUpperCase()} · ${name}` : `Route ${key.toUpperCase()}`
  })
  return labels
}

/** Appends the edited location only when it adds information beyond the activity name (US-087 D-2). */
function locationSuffix(route: RouteInput): string {
  const location = cleanStationName(route.locationName)
  const activity = cleanRouteName(route.activityName)
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
    // An extra leading leg appears exactly when the route starts away from its first place. Group B
    // leaving a mid-trip fork has one; once the groups never travel together (US-095 FROM_START) both
    // start on their own first place, so no leg leads.
    const entry = legs.length === steps.length + 1
    if (entry) pushLeg(0)
    steps.forEach((step, index) => {
      rows.push({
        kind: "branch",
        id: `${key}-step-${index}`,
        route: key,
        title: cleanStationName(step.name),
        meta: `活动 · ${formatMinutes(step.minutes)}`,
      })
      pushLeg(entry ? index + 1 : index)
    })
  } else {
    // Legacy single-activity documents (pre Revision 3): keep one activity row around its legs.
    if (key === "b") pushLeg(0)
    rows.push({
      kind: "branch",
      id: `${key}-activity`,
      route: key,
      title: cleanRouteName(route.activityName) || "活动",
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
  const byKey = branchRowsByKey(routes)
  const max = Math.max(byKey.a.length, byKey.b.length)
  const rows: BranchRow[] = []
  for (let step = 0; step < max; step += 1) {
    if (byKey.a[step]) rows.push(byKey.a[step])
    if (byKey.b[step]) rows.push(byKey.b[step])
  }
  return rows
}

function branchRowsByKey(routes: RouteInput[]): Record<RouteKey, BranchRow[]> {
  const byKey: Record<RouteKey, BranchRow[]> = { a: [], b: [] }
  routes.forEach((route, index) => {
    const key = routeKeyFor(route.groupLabel, index)
    byKey[key] = branchRowsFor(route, key)
  })
  return byKey
}

/**
 * Stage-aligned A/B rows (US-095 FROM_START): index i holds both lanes at the same height. The groups
 * never start together, so each lane opens on its own first place (group A on the trip's first stop,
 * group B on its own activity) and the two only meet again at the reunion.
 */
export function buildBranchPairRows(routes: RouteInput[]): BranchPairRow[] {
  const byKey = branchRowsByKey(routes)
  const max = Math.max(byKey.a.length, byKey.b.length)
  const rows: BranchPairRow[] = []
  for (let step = 0; step < max; step += 1) {
    rows.push({
      kind: "branch-pair",
      id: `pair-${step}`,
      a: byKey.a[step] ?? null,
      b: byKey.b[step] ?? null,
    })
  }
  return rows
}

function mainRow(stop: StopInput, counter: number): MainRow {
  const meta = stop.startLabel === stop.endLabel ? stop.startLabel : `${stop.startLabel} – ${stop.endLabel}`
  return {
    kind: "main",
    id: stop.id,
    title: cleanStationName(stop.name),
    meta,
    side: counter % 2 === 0 ? "right" : "left",
  }
}

/**
 * Builds the full graph. The saved mode decides where the fork starts (US-095): MIDDLE = stop→stop,
 * FROM_START = first stop→stop. Without a saved mode only the main line is returned.
 */
export function buildGraphRows(input: {
  stops: StopInput[]
  splitMode?: SplitBoundaryMode | null
  departureStopId: string | null
  reunionStopId: string | null
  routes: RouteInput[]
}): GraphModel {
  const { stops, departureStopId, reunionStopId, routes } = input
  const mode = input.splitMode === undefined
    ? (departureStopId != null && reunionStopId != null ? "MIDDLE" : null)
    : input.splitMode
  const routeLabels = routeLabelsFor(routes)
  const mainOnly = (): GraphModel => ({
    rows: stops.map((stop, index) => mainRow(stop, index)),
    forkRow: null,
    joinRow: null,
    routeLabels,
    hasBoundaries: false,
    fromStart: false,
  })

  if (mode == null || stops.length === 0) {
    return mainOnly()
  }
  const forkIndex = mode === "FROM_START"
    ? 0
    : (departureStopId ? stops.findIndex((stop) => stop.id === departureStopId) : -1)
  const joinIndex = reunionStopId ? stops.findIndex((stop) => stop.id === reunionStopId) : -1
  const forkValid = forkIndex >= 0 && forkIndex < stops.length
  const joinValid = joinIndex > forkIndex
  if (!forkValid || !joinValid) {
    return mainOnly()
  }

  const rows: GraphRow[] = []
  let mainCounter = 0
  for (let index = 0; index < forkIndex; index += 1) {
    rows.push(mainRow(stops[index], mainCounter))
    mainCounter += 1
  }
  const fromStart = mode === "FROM_START"
  let forkRow: number | null = null
  if (fromStart) {
    rows.push(...buildBranchPairRows(routes))
  } else {
    const fork = stops[forkIndex]
    const forkTitle = cleanStationName(fork.name)
    const branches = buildBranchRows(routes)
    // The generated A route starts at the departure stop, so that activity belongs on the fork node
    // itself instead of being drawn twice (same rule as main's MIDDLE graph).
    const firstA = branches.find((row) => row.route === "a" && row.id === "a-step-0")
    const sameDeparture = firstA != null && forkTitle !== "" && firstA.title === forkTitle
    forkRow = rows.length
    rows.push({
      kind: "fork",
      id: fork.id,
      title: forkTitle,
      meta: sameDeparture ? `${fork.startLabel} · 分头 · A 组${firstA.meta}` : `${fork.startLabel} · 分头`,
      side: "right",
    })
    rows.push(...(sameDeparture ? branches.filter((row) => row !== firstA) : branches))
  }

  const join = stops[joinIndex]
  const joinRow = rows.length
  rows.push({
    kind: "join",
    id: join.id,
    title: cleanStationName(join.name),
    meta: `${join.startLabel} · 会合`,
    side: "left",
  })
  for (let index = joinIndex + 1; index < stops.length; index += 1) {
    rows.push(mainRow(stops[index], mainCounter))
    mainCounter += 1
  }

  return {
    rows,
    forkRow,
    joinRow,
    routeLabels,
    hasBoundaries: true,
    fromStart,
  }
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
