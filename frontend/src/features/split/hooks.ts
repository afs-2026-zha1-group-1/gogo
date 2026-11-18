import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "../../api"
import type { TripMemberList } from "../../types"
import type { MainPlan } from "../../types/mainPlan"
import { SplitApiError, assignGroup, cancelSplitDraft, checkTiming, confirmSplitDraft, fetchBudgetCheck, fetchDraftDetail, generateRoutes, recommendActivities, saveActivities, saveBoundaries, saveRoutes, startDraft } from "./api"
import type { AssignmentRequest, CheckTimingRequest, GenerateRoutesRequest, RecommendActivitiesRequest, SaveActivitiesRequest, SaveBoundariesRequest, SaveRoutesRequest } from "./types"

/**
 * TanStack Query v5 data hooks. The member-only GET detail snapshot is polled so a concurrent
 * initiator's changes surface without a manual reload. Identity comes from the authenticated
 * session cookie; mutations invalidate the detail query on success.
 */
const DETAIL_KEY = "split-draft"
const BUDGET_KEY = "split-budget"
const POLL_MS = 5000

export function useSplitDraft(tripId: string) {
  return useQuery({
    queryKey: [DETAIL_KEY, tripId],
    queryFn: () => fetchDraftDetail(tripId),
    enabled: tripId.length > 0,
    refetchInterval: POLL_MS,
  })
}

/**
 * Main-plan read used only when the trip has no draft / a cancelled draft (US-086 Screen 11).
 * The endpoint returns bare JSON (not the split envelope); NO_DRAFT means "no plan yet" rather
 * than a failure. Other rejections surface as SplitApiError so ErrorState maps the stable code.
 */
export function useMainPlan(tripId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["main-plan", "trip", tripId],
    enabled: enabled && tripId.length > 0,
    queryFn: async (): Promise<MainPlan | null> => {
      const result = await api<MainPlan & { code?: string; message?: string }>(`/api/trips/${tripId}/main-plan`)
      if (result.ok && result.data) return result.data
      const code = result.data?.code ?? "UNKNOWN"
      if (result.status === 404 && code === "NO_DRAFT") return null
      throw new SplitApiError(code, result.data?.message ?? `HTTP ${result.status}`, result.status)
    },
  })
}

export function useStartDraft(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => startDraft(tripId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DETAIL_KEY, tripId] }),
  })
}

/** Moves a member (memberId, defaults to the caller) into the target group (US-040 A1-A9, design DD13/DD16). */
export function useAssignGroup(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: AssignmentRequest) => assignGroup(tripId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DETAIL_KEY, tripId] }),
  })
}

/** Trip member roster used to map group member ids to display names (US-040 DD12). */
export function useTripMembers(tripId: string) {
  return useQuery({
    queryKey: ["trip-members", tripId],
    queryFn: async () => {
      const result = await api<TripMemberList>(`/api/trips/${tripId}/members`)
      if (!result.ok || !result.data) {
        throw new SplitApiError(`HTTP ${result.status}`, `HTTP ${result.status}`, result.status)
      }
      return result.data.members
    },
    enabled: tripId.length > 0,
  })
}

export function useSaveBoundaries(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SaveBoundariesRequest) => saveBoundaries(tripId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DETAIL_KEY, tripId] }),
  })
}

export function useGenerateRoutes(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: GenerateRoutesRequest) => generateRoutes(tripId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DETAIL_KEY, tripId] }),
  })
}

/** Saves the full A/B route pair (US-087 S2); any trip member may edit while the draft is active. */
export function useSaveRoutes(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SaveRoutesRequest) => saveRoutes(tripId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DETAIL_KEY, tripId] }),
  })
}

export function useCheckTiming(tripId: string) {
  return useMutation({
    mutationFn: (body: CheckTimingRequest) => checkTiming(tripId, body),
  })
}

/** Confirm the current draft (US-049): organizer-only write, server revalidates timing. */
export function useConfirmDraft(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (draftVersion: number) => confirmSplitDraft(tripId, draftVersion),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DETAIL_KEY, tripId] }),
  })
}

/** Cancel the initiator's unconfirmed draft (US-050); the row becomes replaceable afterwards. */
export function useCancelDraft(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (draftVersion: number) => cancelSplitDraft(tripId, draftVersion),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DETAIL_KEY, tripId] }),
  })
}

/**
 * Member-readable budget check for the current draft (US-045). Keyed by the draft version so any edit (regenerate,
 * activities, assignment) fetches a fresh projection; enabled only once a draft snapshot exists.
 */
export function useBudgetCheck(tripId: string, draftVersion: number | null | undefined) {
  return useQuery({
    queryKey: [BUDGET_KEY, tripId, draftVersion ?? 0],
    queryFn: () => fetchBudgetCheck(tripId),
    enabled: tripId.length > 0 && draftVersion != null,
  })
}

/** Replaces one group's costed activities (US-045); refresh both the draft and the budget check on success. */
export function useSaveActivities(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SaveActivitiesRequest) => saveActivities(tripId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [DETAIL_KEY, tripId] })
      void queryClient.invalidateQueries({ queryKey: [BUDGET_KEY, tripId] })
    },
  })
}

/** Asks the mock AI for a budget-fitting activity suggestion (US-045); no write happens here. */
export function useRecommendActivities(tripId: string) {
  return useMutation({
    mutationFn: (body: RecommendActivitiesRequest) => recommendActivities(tripId, body),
  })
}
