/**
 * Pure view-model for the Screen 11 team-route graph (US-086). No React, no fetch: the screen maps
 * backend `SplitDraftDetail` / `MainPlan` into these inputs, and both the SVG component and the
 * node:test suite consume the same functions. Branch rows are derived from the existing
 * GroupRoute fields only (activity name/minutes, travel legs, buffer); nothing is invented.
 */

import { tripZone } from "../../lib/trip-zone.ts"
import { cleanRouteName, cleanStationName } from "./station-name.ts"

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
  /** Main-plan stop the row represents (US-092 detail lookup). */
  stopId: string
  title: string
  meta: string
  side: LabelSide
}

export interface JunctionRow {
  kind: "fork" | "join" | "join-fork"
  id: string
  /** Main-plan stop the junction sits on (US-092 detail lookup). */
  stopId: string
  title: string
  meta: string
  side: LabelSide
  roundIndex?: number
  /** join-fork only: the round whose fork shares this node. */
  nextRound?: number
}

export interface BranchRow {
  kind: "branch"
  id: string
  route: RouteKey
  title: string
  meta: string
  roundIndex?: number
  /** Travel connector: drawn as a label on the lane line, never as a node. */
  leg?: boolean
  /** Minutes of that leg (null/undefined = 待补全). */
  legMinutes?: number | null
}

/** One stage with both lanes at the same height (US-095 FROM_START); either side may be empty. */
export interface BranchPairRow {
  kind: "branch-pair"
  id: string
  a: BranchRow | null
  b: BranchRow | null
  roundIndex?: number
}

export type GraphRow = MainRow | JunctionRow | BranchRow | BranchPairRow

/** One fork→join span in a multi-round graph. A merged join-fork uses the same row for both ends. */
export interface RoundSpan {
  roundIndex: number
  forkRow: number | null
  joinRow: number | null
  /** FROM_START span: both lanes start on their own first place instead of a shared fork node. */
  paired?: boolean
  /** First row of a paired span; fork spans use forkRow + 1. */
  firstRow?: number
}

/** One round accepted by the multi-round graph builder. Cancelled rounds are filtered by the caller. */
export interface RoundInput {
  roundIndex: number
  splitMode?: "MIDDLE" | "FROM_START" | null
  departureStopId: string | null
  reunionStopId: string | null
  routes: RouteInput[]
}

export interface GraphModel {
  rows: GraphRow[]
  forkRow: number | null
  joinRow: number | null
  routeLabels: Record<RouteKey, string>
  /** Multi-round spans; empty for the legacy single-round graph. */
  rounds: RoundSpan[]
  /** True when a saved boundary shape exists (US-095). */
  hasBoundaries: boolean
  /** True when any round starts at the trip's first stop (US-095 FROM_START). */
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
function branchRowsFor(route: RouteInput, key: RouteKey, roundIndex?: number, fromStart = false): BranchRow[] {
  const steps = route.steps ?? []
  const legs = route.travelLegsMinutes
  const rows: BranchRow[] = []
  const prefix = roundIndex == null ? "" : `${roundIndex}-`
  const pushLeg = (legIndex: number) => {
    if (legIndex < 0 || legIndex >= legs.length) return
    const minutes = legs[legIndex]
    rows.push({
      kind: "branch",
      id: `${prefix}${key}-leg-${legIndex}`,
      route: key,
      title: "路程",
      meta: minutes == null ? `路程 · ${PENDING_LABEL}` : `路程 · ${minutes} 分钟`,
      roundIndex,
      leg: true,
      legMinutes: minutes,
    })
  }
  if (steps.length > 0) {
    // Group B starts with the outbound trip unless the round starts at the trip's first stop (US-095).
    const entry = key === "b" && !fromStart
    if (entry) pushLeg(0)
    steps.forEach((step, index) => {
      rows.push({
        kind: "branch",
        id: `${prefix}${key}-step-${index}`,
        route: key,
        title: cleanStationName(step.name),
        meta: `活动 · ${formatMinutes(step.minutes)}`,
        roundIndex,
      })
      pushLeg(entry ? index + 1 : index)
    })
  } else {
    // Legacy single-activity documents (pre Revision 3): keep one activity row around its legs.
    if (key === "b") pushLeg(0)
    rows.push({
      kind: "branch",
      id: `${prefix}${key}-activity`,
      route: key,
      title: cleanRouteName(route.activityName) || "活动",
      meta: `活动 · ${formatMinutes(route.activityMinutes)}${locationSuffix(route)}`,
      roundIndex,
    })
    const start = key === "b" ? 1 : 0
    for (let index = start; index < legs.length; index += 1) pushLeg(index)
  }
  if (route.bufferMinutes !== 0) {
    rows.push({
      kind: "branch",
      id: `${prefix}${key}-buffer`,
      route: key,
      title: "缓冲",
      meta: `缓冲 · ${formatMinutes(route.bufferMinutes)}`,
      roundIndex,
    })
  }
  return rows
}

/** Interleave A/B step by step so the two lanes advance together: A活动, B活动, A路程, B路程, ... */
export function buildBranchRows(routes: RouteInput[], roundIndex?: number, fromStart = false): BranchRow[] {
  const byKey: Record<RouteKey, BranchRow[]> = { a: [], b: [] }
  routes.forEach((route, index) => {
    const key = routeKeyFor(route.groupLabel, index)
    byKey[key] = branchRowsFor(route, key, roundIndex, fromStart)
  })
  const max = Math.max(byKey.a.length, byKey.b.length)
  const rows: BranchRow[] = []
  for (let step = 0; step < max; step += 1) {
    if (byKey.a[step]) rows.push(byKey.a[step])
    if (byKey.b[step]) rows.push(byKey.b[step])
  }
  return rows
}

/**
 * Stage-aligned A/B rows (US-095 FROM_START): index i holds both lanes at the same height, so each
 * group opens on its own first place and the two only meet again at the reunion. Group B keeps no
 * outbound leg here (`fromStart`), which is why a lane may start directly on an activity.
 */
export function buildBranchPairRows(routes: RouteInput[], roundIndex?: number): BranchPairRow[] {
  const byKey: Record<RouteKey, BranchRow[]> = { a: [], b: [] }
  routes.forEach((route, index) => {
    const key = routeKeyFor(route.groupLabel, index)
    byKey[key] = branchRowsFor(route, key, roundIndex, true)
  })
  const prefix = roundIndex == null ? "" : `${roundIndex}-`
  const max = Math.max(byKey.a.length, byKey.b.length)
  const rows: BranchPairRow[] = []
  for (let step = 0; step < max; step += 1) {
    rows.push({
      kind: "branch-pair",
      id: `${prefix}pair-${step}`,
      a: byKey.a[step] ?? null,
      b: byKey.b[step] ?? null,
      roundIndex,
    })
  }
  return rows
}

/** Re-interleave after a row was absorbed into a junction, so A/B stay stage-aligned. */
function interleaveBranchRows(rows: BranchRow[]): BranchRow[] {
  const a = rows.filter((row) => row.route === "a")
  const b = rows.filter((row) => row.route === "b")
  const max = Math.max(a.length, b.length)
  const out: BranchRow[] = []
  for (let step = 0; step < max; step += 1) {
    if (a[step]) out.push(a[step])
    if (b[step]) out.push(b[step])
  }
  return out
}

function mainRow(stop: StopInput, counter: number): MainRow {
  const meta = stop.startLabel === stop.endLabel ? stop.startLabel : `${stop.startLabel} – ${stop.endLabel}`
  return {
    kind: "main",
    id: stop.id,
    stopId: stop.id,
    title: cleanStationName(stop.name),
    meta,
    side: counter % 2 === 0 ? "right" : "left",
  }
}

/**
 * Builds the full graph. When both boundaries resolve inside the main line, the main line is split
 * into before / fork / branches / join / after; otherwise only the main line is returned.
 * Passing `rounds` builds the multi-round variant used by US-096.
 */
export function buildGraphRows(input: {
  stops: StopInput[]
  splitMode?: "MIDDLE" | "FROM_START" | null
  departureStopId?: string | null
  reunionStopId?: string | null
  routes?: RouteInput[]
  rounds?: RoundInput[]
}): GraphModel {
  if (input.rounds != null && input.rounds.length > 0) {
    return buildMultiRoundGraphRows(input.stops, input.rounds)
  }
  const { stops, departureStopId = null, reunionStopId = null, routes = [] } = input
  const fromStart = input.splitMode === "FROM_START"
  const forkIndex = fromStart ? 0
    : departureStopId ? stops.findIndex((stop) => stop.id === departureStopId) : -1
  const joinIndex = reunionStopId ? stops.findIndex((stop) => stop.id === reunionStopId) : -1
  const routeLabels = routeLabelsFor(routes)

  if (stops.length === 0 || forkIndex < 0 || joinIndex < 0 || forkIndex >= joinIndex) {
    return {
      rows: stops.map((stop, index) => mainRow(stop, index)),
      forkRow: null,
      joinRow: null,
      routeLabels,
      rounds: [],
      hasBoundaries: false,
      fromStart: false,
    }
  }

  const rows: GraphRow[] = []
  let mainCounter = 0
  for (let index = 0; index < forkIndex; index += 1) {
    rows.push(mainRow(stops[index], mainCounter))
    mainCounter += 1
  }
  let forkRow: number | null = null
  const pairedStart = rows.length
  if (fromStart) {
    // No shared fork node: each group opens on its own first place (US-095).
    rows.push(...buildBranchPairRows(routes))
  } else {
    const fork = stops[forkIndex]
    const branches = buildBranchRows(routes)
    // The generated A route starts at the departure stop. Render that activity on the
    // fork itself, while retaining its following travel leg and any edited A stops.
    const firstA = branches.find((row) => row.route === "a" && row.id === "a-step-0")
    const forkTitle = cleanStationName(fork.name)
    const sameDeparture = firstA != null && forkTitle !== "" && firstA.title === forkTitle
    forkRow = rows.length
    rows.push({
      kind: "fork",
      id: fork.id,
      stopId: fork.id,
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
    stopId: join.id,
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
    rounds: fromStart
      ? [{ roundIndex: 1, forkRow: null, joinRow, paired: true, firstRow: pairedStart }]
      : [],
    hasBoundaries: true,
    fromStart,
  }
}

interface PreparedRound {
  input: RoundInput
  roundIndex: number
  depIndex: number
  reuIndex: number
  forkTitle: string
  joinTitle: string
  forkStartLabel: string
  joinStartLabel: string
  firstA: BranchRow | null
  sameDeparture: boolean
  fromStart: boolean
  branches: (BranchRow | BranchPairRow)[]
}

/**
 * Multi-round graph (US-096). Builds one fork→join span per round on the same three lanes.
 * A join and the next fork at the same stop collapse into one `join-fork` row, and the next
 * round's A first activity is absorbed into that row so the stop is not drawn twice.
 */
function buildMultiRoundGraphRows(stops: StopInput[], rounds: RoundInput[]): GraphModel {
  const prepared: PreparedRound[] = rounds
    .filter((round) => round.reunionStopId != null
      && (round.departureStopId != null || round.splitMode === "FROM_START"))
    .map((round): PreparedRound | null => {
      const fromStart = round.splitMode === "FROM_START"
      const depIndex = fromStart ? 0 : stops.findIndex((stop) => stop.id === round.departureStopId)
      const reuIndex = stops.findIndex((stop) => stop.id === round.reunionStopId)
      if (depIndex < 0 || reuIndex <= depIndex) return null
      const fork = stops[depIndex]
      const join = stops[reuIndex]
      const forkTitle = cleanStationName(fork.name)
      const pairs = fromStart ? buildBranchPairRows(round.routes, round.roundIndex) : null
      const branches = fromStart ? null : buildBranchRows(round.routes, round.roundIndex, false)
      const firstA = branches?.find((row) => row.route === "a" && row.title === forkTitle) ?? null
      const sameDeparture = firstA != null && forkTitle !== ""
      return {
        input: round,
        roundIndex: round.roundIndex,
        depIndex,
        reuIndex,
        forkTitle,
        joinTitle: cleanStationName(join.name),
        forkStartLabel: fork.startLabel,
        joinStartLabel: join.startLabel,
        firstA,
        sameDeparture,
        fromStart,
        branches: pairs
          ?? interleaveBranchRows(sameDeparture && branches ? branches.filter((row) => row !== firstA) : (branches ?? [])),
      }
    })
    .filter((round): round is PreparedRound => round != null)
    .sort((left, right) => left.roundIndex - right.roundIndex)

  const routeLabels = prepared.length > 1
    ? { a: "Route A · 两次", b: "Route B · 两次" }
    : routeLabelsFor(prepared[prepared.length - 1]?.input.routes ?? [])

  if (prepared.length === 0) {
    return {
      rows: stops.map((stop, index) => mainRow(stop, index)),
      forkRow: null,
      joinRow: null,
      routeLabels,
      rounds: [],
      hasBoundaries: false,
      fromStart: false,
    }
  }

  const rows: GraphRow[] = []
  const spans: RoundSpan[] = []
  let mainCounter = 0
  let cursor = 0
  let consumedFork: { roundIndex: number; row: number } | null = null

  prepared.forEach((round, index) => {
    const span: RoundSpan = { roundIndex: round.roundIndex, forkRow: null, joinRow: null }
    if (consumedFork != null && consumedFork.roundIndex === round.roundIndex) {
      span.forkRow = consumedFork.row
    } else {
      for (let stopIndex = cursor; stopIndex < round.depIndex; stopIndex += 1) {
        rows.push(mainRow(stops[stopIndex], mainCounter))
        mainCounter += 1
      }
      if (round.fromStart) {
        // No shared fork node: both lanes open on their own first place (US-095).
        span.paired = true
        span.firstRow = rows.length
      } else {
        span.forkRow = rows.length
        rows.push({
          kind: "fork",
          id: `${round.roundIndex}-fork-${stops[round.depIndex].id}`,
          stopId: stops[round.depIndex].id,
          title: round.forkTitle,
          meta: `${round.forkStartLabel} · 第 ${round.roundIndex} 次分头`,
          side: "right",
          roundIndex: round.roundIndex,
        })
      }
    }

    rows.push(...round.branches)

    const next = prepared[index + 1]
    if (next != null && next.depIndex === round.reuIndex) {
      const mergedRow = rows.length
      rows.push({
        kind: "join-fork",
        id: `${round.roundIndex}-${next.roundIndex}-join-fork-${stops[round.reuIndex].id}`,
        stopId: stops[round.reuIndex].id,
        title: round.joinTitle,
        meta: `${round.joinStartLabel} · 会合 · 再分头`,
        side: "left",
        roundIndex: round.roundIndex,
        nextRound: next.roundIndex,
      })
      span.joinRow = mergedRow
      consumedFork = { roundIndex: next.roundIndex, row: mergedRow }
    } else {
      span.joinRow = rows.length
      rows.push({
        kind: "join",
        id: `${round.roundIndex}-join-${stops[round.reuIndex].id}`,
        stopId: stops[round.reuIndex].id,
        title: round.joinTitle,
        meta: `${round.joinStartLabel} · 第 ${round.roundIndex} 次会合`,
        side: "left",
        roundIndex: round.roundIndex,
      })
      consumedFork = null
    }

    spans.push(span)
    cursor = round.reuIndex + 1
  })

  for (let stopIndex = cursor; stopIndex < stops.length; stopIndex += 1) {
    rows.push(mainRow(stops[stopIndex], mainCounter))
    mainCounter += 1
  }

  return {
    rows,
    forkRow: spans[0]?.forkRow ?? null,
    joinRow: spans[spans.length - 1]?.joinRow ?? null,
    routeLabels,
    rounds: spans,
    hasBoundaries: spans.length > 0,
    fromStart: prepared.some((round) => round.fromStart),
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
