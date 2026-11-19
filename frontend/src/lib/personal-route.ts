/**
 * US-084/US-089 + ai-split-route-generation: pure derivation of the member's personal timeline (design DD-2/DD-3, R6).
 * Confirmed split snapshot is authoritative: shared segments come from mainPlanStops (ISO timestamps).
 * Group A keeps the confirmed plan; group B expands its own ordered station list and travel legs.
 * Older routes without steps keep their single activity. Missing times stay null (待确认, never fabricated).
 */
import type { ScheduleItem } from './countdown'
import type { SplitDraftDetail, PlanStop as SplitPlanStop } from '../features/split/types'
import type { MainPlan } from '../types/mainPlan'
import { cleanStationName } from '../features/split/station-name.ts'

/** Combine main-plan `HH:mm` stops with the trip start date in the device-local timezone. */
export function scheduleFromMainPlan(plan: MainPlan | null, startDate: string): ScheduleItem[] {
  if (!plan || plan.stops.length === 0) return []
  return plan.stops.map((stop) => {
    const dayIndex = stop.dayIndex ?? 1
    return {
      key: `stop-${stop.seq}`,
      stopId: stop.id,
      dayIndex,
      name: stop.name,
      note: stop.note ?? null,
      start: localClock(startDate, stop.startTime, dayIndex - 1),
      end: localClock(startDate, stop.endTime, dayIndex - 1),
      groupLabel: null,
      interests: stop.interests,
      address: stop.address ?? null,
      lat: stop.lat ?? null,
      lon: stop.lng ?? null,
      travelMinutesToNext: stop.travelMinutesToNext,
    }
  })
}

function localClock(dateStr: string, clock: string, dayOffset = 0): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock)
  if (!match) return null
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day + dayOffset, Number(match[1]), Number(match[2]), 0, 0).getTime()
}

function toMs(iso: string | null): number | null {
  if (iso == null) return null
  const value = Date.parse(iso)
  return Number.isNaN(value) ? null : value
}

function sharedItem(stop: SplitPlanStop, plan: MainPlan | null, roundIndex?: number): ScheduleItem {
  // The split snapshot carries no interests; enrich from the main plan by name when available. Matching also
  // recovers the main-plan stop id so a shared line item stays editable (it is the same stop the dialog edits).
  const matched = plan?.stops.find(
    (candidate) => cleanStationName(candidate.name) === cleanStationName(stop.name),
  )
  return {
    key: roundIndex == null ? stop.id : `r${roundIndex}-${stop.id}`,
    stopId: matched?.id,
    name: stop.name,
    start: toMs(stop.startAt),
    end: toMs(stop.endAt),
    groupLabel: null,
    roundIndex,
    interests: matched?.interests ?? [],
    address: null,
    lat: null,
    lon: null,
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
  // departureAt/reunionAt are the two stops' start times (backend BoundaryResponse). Group A keeps the confirmed
  // plan and walks its scheduled stops inside the window; group B is away from them. Whether a group already had
  // steps (old documents) is not the deciding signal — group B may now also carry its own generated station list
  // (ai-split-route-generation), so the main-line judgment keys off the group label first.
  const steps = myRoute.steps ?? []
  const keepsMainLine =
    myGroupLabel === 'A' && steps.length > 0 && departureIndex >= 0 && reunionIndex > departureIndex
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
  const legs = myRoute.travelLegsMinutes ?? []

  if (myGroupLabel === 'B' && steps.length > 0 && departureIndex >= 0 && reunionIndex > departureIndex) {
    const validMinutes = (value: number | null | undefined): value is number =>
      value != null && Number.isSafeInteger(value) && value >= 0
    const validTiming = departureMs != null && reunionMs != null && reunionMs > departureMs
      && legs.length === steps.length + 1 && legs.every(validMinutes)
      && steps.every((step) => validMinutes(step.minutes)) && validMinutes(myRoute.bufferMinutes)
      && steps.reduce((sum, step) => sum + step.minutes, 0) + legs.reduce((sum, leg) => sum + leg, 0)
        + (myRoute.bufferMinutes ?? 0) <= (reunionMs - departureMs) / 60_000
    let cursor = validTiming && departureMs != null ? departureMs + legs[0] * 60_000 : null
    const groupItems: ScheduleItem[] = steps.map((step, index) => {
      const start: number | null = cursor
      const end: number | null = start == null ? null : start + step.minutes * 60_000
      const nextLeg = legs[index + 1]
      cursor = end == null || !validMinutes(nextLeg) ? null : end + nextLeg * 60_000
      const name = cleanStationName(step.name)
      return {
        key: `group-${myGroupLabel}-step-${index}`,
        name,
        start,
        end,
        groupLabel: myGroupLabel,
        splitStep: { roundIndex: detail.roundIndex, groupLabel: myGroupLabel, stepIndex: index, minutes: step.minutes, stepCount: steps.length },
        interests: plan?.stops.find((candidate) => candidate.name === name)?.interests ?? [],
        address: null,
        lat: null,
        lon: null,
        travelMinutesToNext: validMinutes(nextLeg) ? nextLeg : null,
      }
    })
    return [
      ...stops.slice(0, departureIndex).map((stop) => sharedItem(stop, plan)),
      {
        ...sharedItem(stops[departureIndex], plan),
        kind: 'split-departure',
        start: departureMs,
        end: departureMs,
        travelMinutesToNext: validMinutes(legs[0]) ? legs[0] : null,
      },
      ...groupItems,
      ...after.map((stop) => sharedItem(stop, plan)),
    ]
  }

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
    lat: null,
    lon: null,
    travelMinutesToNext: legs.length > 0 ? legs[legs.length - 1] : null,
  }

  const items = [
    ...before.map((stop) => sharedItem(stop, plan)),
    ...(mainLineItems ?? [groupItem]),
    ...after.map((stop) => sharedItem(stop, plan)),
  ]
  return items.sort((a, b) => (a.start ?? Number.MAX_SAFE_INTEGER) - (b.start ?? Number.MAX_SAFE_INTEGER))
}

function branchItemsForRound(
  round: SplitDraftDetail,
  groupLabel: string,
  route: SplitDraftDetail['routes'][number],
  plan: MainPlan | null,
): ScheduleItem[] {
  const steps = route.steps ?? []
  const legs = route.travelLegsMinutes ?? []
  const departureMs = toMs(round.departureAt)
  const reunionMs = toMs(round.reunionAt)
  const valid = (value: number | null | undefined): value is number =>
    value != null && Number.isSafeInteger(value) && value >= 0
  const validTiming = departureMs != null && reunionMs != null && reunionMs > departureMs
    && legs.length === steps.length + 1 && legs.every(valid)
    && steps.every((step) => valid(step.minutes)) && valid(route.bufferMinutes)
  let cursor = validTiming ? departureMs! + (legs[0] ?? 0) * 60_000 : null
  return steps.map((step, index) => {
    const start = cursor
    const end = start == null ? null : start + step.minutes * 60_000
    const nextLeg = legs[index + 1]
    cursor = end == null || !valid(nextLeg) ? null : end + nextLeg * 60_000
    const name = cleanStationName(step.name)
    return {
      key: `r${round.roundIndex}-group-${groupLabel}-step-${index}`,
      name,
      start,
      end,
      groupLabel,
      roundIndex: round.roundIndex,
      splitStep: { roundIndex: round.roundIndex, groupLabel, stepIndex: index, minutes: step.minutes, stepCount: steps.length },
      interests: plan?.stops.find((candidate) => candidate.name === name)?.interests ?? [],
      address: null,
      lat: null,
      lon: null,
      travelMinutesToNext: valid(nextLeg) ? nextLeg : null,
    }
  })
}

/**
 * US-096: derive the member's personal timeline across every confirmed round. Shared stops are emitted once;
 * a join station that is also the next round's departure is not duplicated, and members who changed groups are
 * labelled with the group of the round each entry belongs to.
 */
export function derivePersonalRouteFromRounds(
  rounds: SplitDraftDetail[],
  accountId: string,
  plan: MainPlan | null,
): ScheduleItem[] | null {
  const confirmed = rounds
    .filter((round) => round.status === 'confirmed')
    .sort((left, right) => left.roundIndex - right.roundIndex)
  if (confirmed.length === 0) return null
  const stops = confirmed[0].mainPlanStops
  const items: ScheduleItem[] = []
  let cursor = 0

  for (const round of confirmed) {
    const groupLabel = Object.entries(round.groups)
      .find(([, members]) => members.includes(accountId))?.[0]
    if (groupLabel == null) return null
    const departureIndex = round.departureStopId
      ? stops.findIndex((stop) => stop.id === round.departureStopId)
      : 0
    const reunionIndex = round.reunionStopId
      ? stops.findIndex((stop) => stop.id === round.reunionStopId)
      : -1
    if (departureIndex < 0 || reunionIndex <= departureIndex) continue

    for (let index = cursor; index < departureIndex; index += 1) {
      items.push(sharedItem(stops[index], plan, round.roundIndex))
    }
    const start = Math.max(departureIndex, cursor)
    const route = round.routes.find((candidate) => candidate.groupLabel === groupLabel)
    if (route == null) {
      for (let index = start; index < reunionIndex; index += 1) {
        items.push(sharedItem(stops[index], plan, round.roundIndex))
      }
    } else if (groupLabel === 'A' && (route.steps?.length ?? 0) > 0) {
      for (let index = start; index < reunionIndex; index += 1) {
        items.push({ ...sharedItem(stops[index], plan, round.roundIndex), groupLabel })
      }
    } else if ((route.steps?.length ?? 0) > 0) {
      items.push(...branchItemsForRound(round, groupLabel, route, plan))
    } else {
      const departureMs = toMs(round.departureAt)
      const reunionMs = toMs(round.reunionAt)
      let activityStart: number | null = null
      let activityEnd: number | null = null
      if (departureMs != null && reunionMs != null && route.activityMinutes != null) {
        const windowMs = reunionMs - departureMs
        const activityMs = route.activityMinutes * 60_000
        if (activityMs > 0 && activityMs <= windowMs) {
          const center = departureMs + windowMs / 2
          activityStart = center - activityMs / 2
          activityEnd = center + activityMs / 2
        }
      }
      items.push({
        key: `r${round.roundIndex}-group-${groupLabel}`,
        name: route.activityName ?? '小组活动',
        start: activityStart,
        end: activityEnd,
        groupLabel,
        roundIndex: round.roundIndex,
        interests: plan?.stops.find((candidate) => candidate.name === route.activityName)?.interests ?? [],
        address: null,
        lat: null,
        lon: null,
        travelMinutesToNext: null,
      })
    }

    items.push(sharedItem(stops[reunionIndex], plan, round.roundIndex))
    cursor = reunionIndex + 1
  }

  for (let index = cursor; index < stops.length; index += 1) {
    items.push(sharedItem(stops[index], plan))
  }
  return items
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

/** US-096 equivalent for the trip overview; same fallback priority as `selectSchedule`. */
export function selectScheduleFromRounds(
  rounds: SplitDraftDetail[] | null,
  accountId: string | null,
  plan: MainPlan | null,
  startDate: string,
): ScheduleItem[] {
  if (rounds && accountId) {
    const personal = derivePersonalRouteFromRounds(rounds, accountId, plan)
    if (personal) return personal
  }
  return scheduleFromMainPlan(plan, startDate)
}
