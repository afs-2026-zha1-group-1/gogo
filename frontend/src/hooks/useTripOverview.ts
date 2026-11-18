/**
 * US-083/084/085 (design DD-1): concurrent five-read composition for the trip detail
 * overview. The trip read gates the page (denied/missing/failed keep the existing
 * states); the other four reads degrade gracefully so one failure never blanks the
 * page. All derivation is pure (lib/personal-route, lib/countdown).
 */
import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage } from '../api'
import { fetchDraftDetail } from '../features/split/api'
import type { SplitDraftDetail } from '../features/split/types'
import { useAuth } from '../features/auth/AuthProvider'
import { selectSchedule } from '../lib/personal-route'
import type { ScheduleItem } from '../lib/countdown'
import type { Trip, TripMember, TripMemberList } from '../types'
import type { MainPlan, MainPlanInputs } from '../types/mainPlan'

export interface ReadinessSummary {
  readyCount: number
  memberCount: number
}

export type TripOverviewState =
  | { kind: 'loading' }
  | { kind: 'denied'; message?: string }
  | { kind: 'missing'; message?: string }
  | { kind: 'failed'; message: string | undefined }
  | {
      kind: 'ready'
      trip: Trip
      plan: MainPlan | null
      readiness: ReadinessSummary | null
      members: TripMember[]
      split: SplitDraftDetail | null
      schedule: ScheduleItem[]
      myGroupLabel: string | null
      /** Re-runs the five reads (US-090 keeps 我的方案 in step after a stop edit). */
      reload: () => void
    }

export function useTripOverview(tripId: number): TripOverviewState {
  const { accountId } = useAuth()
  const [state, setState] = useState<TripOverviewState>({ kind: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  useEffect(() => {
    let active = true
    // Keep the rendered overview during a reload of the same trip, so editing a stop does not unmount the page
    // (dialog, scroll position and focus survive); only a first load or a different trip shows the skeleton.
    setState((prev) => (prev.kind === 'ready' && prev.trip.id === tripId ? prev : { kind: 'loading' }))
    Promise.allSettled([
      api<Trip>(`/api/trips/${tripId}`),
      api<MainPlan>(`/api/trips/${tripId}/main-plan`),
      api<MainPlanInputs>(`/api/trips/${tripId}/main-plan/inputs`),
      api<TripMemberList>(`/api/trips/${tripId}/members`),
      fetchDraftDetail(String(tripId)),
    ]).then(([tripResult, planResult, inputsResult, membersResult, splitResult]) => {
      if (!active) return
      if (tripResult.status === 'rejected') {
        setState({ kind: 'failed', message: errorMessage(tripResult.reason) })
        return
      }
      const tripRead = tripResult.value
      if (!tripRead.ok) {
        if (tripRead.status === 403) setState({ kind: 'denied', message: tripRead.data?.message })
        else if (tripRead.status === 404) setState({ kind: 'missing', message: tripRead.data?.message })
        else setState({ kind: 'failed', message: tripRead.data?.message ?? `HTTP ${tripRead.status}` })
        return
      }
      if (!tripRead.data) {
        setState({ kind: 'failed', message: `HTTP ${tripRead.status}` })
        return
      }
      const trip = tripRead.data
      // 404 NO_DRAFT (no plan yet) and any secondary failure degrade to null/[] (DD-1).
      const plan = planResult.status === 'fulfilled' && planResult.value.ok ? planResult.value.data : null
      const inputs = inputsResult.status === 'fulfilled' && inputsResult.value.ok ? inputsResult.value.data : null
      const members = membersResult.status === 'fulfilled' && membersResult.value.ok && membersResult.value.data
        ? membersResult.value.data.members
        : []
      const split = splitResult.status === 'fulfilled' ? splitResult.value : null
      const schedule = selectSchedule(split, accountId, plan, trip.startDate)
      const myGroupLabel = split?.status === 'confirmed' && accountId != null
        ? Object.entries(split.groups).find(([, groupMembers]) => groupMembers.includes(accountId))?.[0] ?? null
        : null
      setState({
        kind: 'ready',
        trip,
        plan,
        readiness: inputs ? { readyCount: inputs.readyCount, memberCount: inputs.memberCount } : null,
        members,
        split,
        schedule,
        myGroupLabel,
        reload,
      })
    })
    return () => {
      active = false
    }
  }, [tripId, accountId, reloadKey, reload])

  return state
}