/**
 * US-084/US-089: pure derivation of the member's personal timeline (design DD-2/DD-3, R6).
 * Confirmed split snapshot is authoritative: shared segments come from mainPlanStops (ISO timestamps).
 * The group that keeps the confirmed plan (route steps present) fills the departure→reunion segment with
 * those main-plan stops; the other group gets its generated activity centered inside the window only when
 * its duration is known and fits. Missing inputs stay null (待确认, never fabricated).
 */
import type { ScheduleItem } from './countdown'
import type { SplitDraftDetail, PlanStop as SplitPlanStop } from '../features/split/types'
import type { MainPlan } from '../types/mainPlan'

/** Combine main-plan `HH:mm` stops with the trip start date in the device-local timezone. */
export function scheduleFromMainPlan(plan: MainPlan | null, startDate: string): ScheduleItem[] {
  if (!plan || plan.stops.length === 0) return []
  return plan.stops.map((stop) => ({
    key: `stop-${stop.seq}`,
    name: stop.name,
    start: localClock(startDate, stop.startTime),
    end: localClock(startDate, stop.endTime),
    groupLabel: null,
    interests: stop.interests,
    address: null,
    travelMinutesToNext: stop.travelMinutesToNext,
  }))
}

function localClock(dateStr: string, clock: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock)
  if (!match) return null
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, Number(match[1]), Number(match[2]), 0, 0).getTime()
}

function toMs(iso: string | null): number | null {
  if (iso == null) return null
  const value = Date.parse(iso)
  return Number.isNaN(value) ? null : value
}

function sharedItem(stop: SplitPlanStop, plan: MainPlan | null): ScheduleItem {
  // The split snapshot carries no interests; enrich from the main plan by name when available.
  const interests = plan?.stops.find((candidate) => candidate.name === stop.name)?.interests ?? []
  return {
    key: stop.id,
    name: stop.name,
    start: toMs(stop.startAt),
    end: toMs(stop.endAt),
    groupLabel: null,
    interests,
    address: null,
    travelMinutesToNext: null,
  }
}

/**
 * Derive the current member's personal timeline from a confirmed split snapshot.
 * Returns null when the draft is not confirmed, the member is unassigned, or their
 * group has no route — callers fall back to the main plan (R6).
 */
export function derivePersonalRoute(
  detail: SplitDraftDetail,
  accountId: string,
  plan: MainPlan | null,
): ScheduleItem[] | null {
  if (detail.status !== 'confirmed') return null
  const myGroupLabel = Object.entries(detail.groups)
    .find(([, members]) => members.includes(accountId))?.[0]
  if (myGroupLabel == null) return null
  const myRoute = detail.routes.find((route) => route.groupLabel === myGroupLabel)
  if (!myRoute) return null

  const stops = detail.mainPlanStops
  // US-095: FROM_START has no shared first stop.
  const departureIndex = detail.splitMode === "FROM_START"
    ? 0
    : stops.findIndex((stop) => stop.id === detail.departureStopId)
  const reunionIndex = stops.findIndex((stop) => stop.id === detail.reunionStopId)
  // departureAt/reunionAt are the two window ends (backend BoundaryResponse). The group that keeps
  // the confirmed plan walks its scheduled stops inside the window; the other group is away from them.
  const steps = myRoute.steps ?? []
  const keepsMainLine =
    steps.length > 0 && departureIndex >= 0 && reunionIndex > departureIndex
  const mainLineItems = keepsMainLine
    ? stops.slice(departureIndex, reunionIndex).map((stop) => ({
        ...sharedItem(stop, plan),
        groupLabel: myGroupLabel,
      }))
    : null
  const before = detail.splitMode === "FROM_START"
    ? []
    : departureIndex >= 0
      ? stops.slice(0, keepsMainLine ? departureIndex : departureIndex + 1)
      : stops
  const after = reunionIndex >= 0 ? stops.slice(reunionIndex) : []

  const departureMs = toMs(detail.departureAt)
  const reunionMs = toMs(detail.reunionAt)
  let activityStart: number | null = null
  let activityEnd: number | null = null
  if (departureMs != null && reunionMs != null && myRoute.activityMinutes != null) {
    const windowMs = reunionMs - departureMs
    const activityMs = myRoute.activityMinutes * 60_000
    if (activityMs > 0 && activityMs <= windowMs) {
      const center = departureMs + windowMs / 2
      activityStart = center - activityMs / 2
      activityEnd = center + activityMs / 2
    }
  }
  const legs = myRoute.travelLegsMinutes ?? []
  // T7.3 验收缺陷修复：组活动与共同段一样按名从 main plan 补全 interests（无匹配保持空）。
  const groupInterests =
    plan?.stops.find((candidate) => candidate.name === myRoute.activityName)?.interests ?? []
  const groupItem: ScheduleItem = {
    key: `group-${myGroupLabel}`,
    name: myRoute.activityName ?? '小组活动',
    start: activityStart,
    end: activityEnd,
    groupLabel: myGroupLabel,
    interests: groupInterests,
    address: null,
    travelMinutesToNext: legs.length > 0 ? legs[legs.length - 1] : null,
  }

  const items = [
    ...before.map((stop) => sharedItem(stop, plan)),
    ...(mainLineItems ?? [groupItem]),
    ...after.map((stop) => sharedItem(stop, plan)),
  ]
  return items.sort((a, b) => (a.start ?? Number.MAX_SAFE_INTEGER) - (b.start ?? Number.MAX_SAFE_INTEGER))
}

/** R6 priority: confirmed personal route > main-plan stops > empty (no-plan state). */
export function selectSchedule(
  split: SplitDraftDetail | null,
  accountId: string | null,
  plan: MainPlan | null,
  startDate: string,
): ScheduleItem[] {
  if (split && accountId) {
    const personal = derivePersonalRoute(split, accountId, plan)
    if (personal) return personal
  }
  return scheduleFromMainPlan(plan, startDate)
}