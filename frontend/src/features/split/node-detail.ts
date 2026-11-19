import { formatCost } from "../../lib/format.ts"
import { routeKeyFor, type BranchRow, type GraphRow, type RouteKey } from "./graph-model.ts"
import { cleanRouteName, cleanStationName } from "./station-name.ts"
import type { GroupRoute, SplitDraftDetail } from "./types.ts"

/**
 * US-092 node sheet view-model. Everything is derived from the member-only split snapshot the graph
 * already renders: main-plan stops carry name/time/location/cost, branch rows carry the round's route
 * steps, travel legs, buffer and costed activities. Fields the backend does not expose (per-node todo
 * lists) stay empty and the sheet hides them instead of inventing copy.
 */

export type NodeBadgeVariant = "brand" | "a" | "b"

export interface NodeDetailView {
  id: string
  badgeLabel: string
  badgeVariant: NodeBadgeVariant
  time: string
  title: string
  location: string | null
  people: string
  fee: string | null
  tasks: string[]
}

export interface NodeStopInfo {
  locationName?: string | null
  costCents?: number | null
}

export interface NodeDetailContext {
  /** Confirmed rounds that produced the graph, used to resolve the row's round. */
  rounds: SplitDraftDetail[]
  /** Main-plan stops keyed by the ids used in graph rows. */
  stopsById: Map<string, NodeStopInfo>
  destination: string | null
  groupCounts: Record<RouteKey, number>
  totalMembers: number
}

function roundFor(row: GraphRow, context: NodeDetailContext): SplitDraftDetail | null {
  const roundIndex = row.kind === "main" ? undefined : row.roundIndex
  if (roundIndex != null) {
    return context.rounds.find((round) => round.roundIndex === roundIndex) ?? null
  }
  return context.rounds.length === 1 ? context.rounds[0] : null
}

function membersIn(round: SplitDraftDetail | null, groupLabel: string): number | null {
  if (!round) return null
  const target = groupLabel.trim().toUpperCase()
  const entry = Object.entries(round.groups).find(([key]) => key.trim().toUpperCase() === target)
  return entry ? entry[1].length : 0
}

function totalMembersOf(round: SplitDraftDetail | null, fallback: number): number {
  if (!round) return fallback
  return Object.values(round.groups).reduce((sum, ids) => sum + ids.length, 0)
}

function feeLabel(cents: number | null | undefined, destination: string | null): string | null {
  if (cents == null) return null
  return cents === 0 ? "免费" : `人均 ${formatCost(cents, destination)}`
}

function locationLabel(value: string | null | undefined): string | null {
  const cleaned = cleanStationName(value ?? "")
  return cleaned === "" ? null : cleaned
}

function routeFor(round: SplitDraftDetail | null, key: RouteKey): GroupRoute | null {
  if (!round) return null
  for (let index = 0; index < round.routes.length; index += 1) {
    const route = round.routes[index]
    if (routeKeyFor(route.groupLabel, index) === key) return route
  }
  return null
}

function branchSuffix(row: BranchRow): string {
  const marker = `-${row.route}-`
  const at = row.id.indexOf(marker)
  return at >= 0 ? row.id.slice(at + marker.length) : row.id
}

function activityFor(route: GroupRoute | null, name: string | null | undefined) {
  if (!route?.activities || name == null || name === "") return null
  const target = cleanStationName(name)
  return route.activities.find((activity) => cleanStationName(activity.name) === target) ?? null
}

function branchDetail(row: BranchRow, context: NodeDetailContext): NodeDetailView {
  const round = roundFor(row, context)
  const route = routeFor(round, row.route)
  const routeName = `Route ${row.route.toUpperCase()}`
  const count = membersIn(round, route?.groupLabel ?? row.route) ?? context.groupCounts[row.route]
  const suffix = branchSuffix(row)
  const base = {
    id: row.id,
    badgeVariant: row.route,
    time: row.meta,
    title: row.title,
    people: count > 0 ? `${routeName} · ${count} 人` : routeName,
    tasks: [],
  }

  if (suffix === "buffer") {
    return { ...base, badgeLabel: `${routeName} · 缓冲`, location: null, fee: null }
  }
  if (suffix.startsWith("leg-")) {
    return { ...base, badgeLabel: `${routeName} · 路程`, location: null, fee: null }
  }
  if (suffix === "activity") {
    const name = cleanRouteName(route?.activityName ?? row.title)
    const activity = activityFor(route, name)
    return {
      ...base,
      badgeLabel: `${routeName} · 活动`,
      location: locationLabel(activity?.location ?? route?.locationName),
      fee: feeLabel(activity?.costCents, context.destination),
    }
  }

  const index = Number(suffix.slice("step-".length))
  const step = Number.isInteger(index) ? route?.steps?.[index] ?? null : null
  const activity = activityFor(route, step?.name ?? row.title)
  return {
    ...base,
    badgeLabel: `${routeName} · 活动`,
    location: locationLabel(activity?.location),
    fee: feeLabel(activity?.costCents, context.destination),
  }
}

export function buildNodeDetail(row: GraphRow, context: NodeDetailContext): NodeDetailView {
  if (row.kind === "branch") {
    return branchDetail(row, context)
  }

  const round = roundFor(row, context)
  const stop = context.stopsById.get(row.stopId)
  const total = totalMembersOf(round, context.totalMembers)
  return {
    id: row.id,
    badgeLabel: row.kind === "main" ? "主线站点"
      : row.kind === "fork" ? "分头点"
        : row.kind === "join" ? "会合点"
          : "会合再分头",
    badgeVariant: "brand",
    time: row.meta,
    title: row.title,
    location: locationLabel(stop?.locationName),
    people: total > 0 ? `全员 · ${total} 人` : "全员",
    fee: feeLabel(stop?.costCents, context.destination),
    tasks: [],
  }
}
