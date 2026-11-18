import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { api } from "../../api"
import type { Trip, TripMemberList } from "../../types"
import type { MainPlan } from "../../types/mainPlan"
import { SplitApiError, assignGroup, cancelConfirmedSplit, cancelSplitDraft, checkTiming, confirmSplitDraft, fetchBudgetCheck, fetchDraftDetail, fetchRounds, generateRoutes, saveActivities, saveBoundaries, saveRoutes, startDraft, startNextRound } from "./api"
import type { AssignmentRequest, CheckTimingRequest, GenerateRoutesRequest, SaveActivitiesRequest, SaveBoundariesRequest, SaveRoutesRequest } from "./types"

/**
 * TanStack Query v5 data hooks. The member-only GET detail snapshot is polled so a concurrent
 * initiator's changes surface without a manual reload. Identity comes from the authenticated
 * session cookie; mutations invalidate the detail query on success.
 */
const DETAIL_KEY = "split-draft"
const ROUNDS_KEY = "split-rounds"
const BUDGET_KEY = "split-budget"
const POLL_MS = 5000

/** Round index from the route (`/split/rounds/:roundIndex/...`); old paths imply round 1. */
export function useRoundIndex(): number {
  const { roundIndex } = useParams()
  const parsed = Number(roundIndex)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function invalidateSplit(queryClient: QueryClient, tripId: string): void {
  void queryClient.invalidateQueries({ queryKey: [DETAIL_KEY, tripId] })
  void queryClient.invalidateQueries({ queryKey: [ROUNDS_KEY, tripId] })
  void queryClient.invalidateQueries({ queryKey: [BUDGET_KEY, tripId] })
}

/** All rounds plus the aggregate status and next-round gate (US-096). */
export function useSplitRounds(tripId: string) {
  return useQuery({
    queryKey: [ROUNDS_KEY, tripId],
    queryFn: () => fetchRounds(tripId),
    enabled: tripId.length > 0,
    refetchInterval: POLL_MS,
  })
}

export function useSplitDraft(tripId: string, roundIndex: number) {
  return useQuery({
    queryKey: [DETAIL_KEY, tripId, roundIndex],
    queryFn: () => fetchDraftDetail(tripId, roundIndex),
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
    onSuccess: () => invalidateSplit(queryClient, tripId),
  })
}

/** Starts the next round; the response carries the new round index (US-096). */
export function useStartNextRound(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => startNextRound(tripId),
    onSuccess: () => invalidateSplit(queryClient, tripId),
  })
}

/** Moves a member (memberId, defaults to the caller) into the target group (US-040 A1-A9, design DD13/DD16). */
export function useAssignGroup(tripId: string, roundIndex: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: AssignmentRequest) => assignGroup(tripId, roundIndex, body),
    onSuccess: () => invalidateSplit(queryClient, tripId),
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

export function useSaveBoundaries(tripId: string, roundIndex: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SaveBoundariesRequest) => saveBoundaries(tripId, roundIndex, body),
    onSuccess: () => invalidateSplit(queryClient, tripId),
  })
}

export function useGenerateRoutes(tripId: string, roundIndex: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: GenerateRoutesRequest) => generateRoutes(tripId, roundIndex, body),
    onSuccess: () => invalidateSplit(queryClient, tripId),
  })
}

/** Saves the full A/B route pair (US-087 S2); any trip member may edit while the draft is active. */
export function useSaveRoutes(tripId: string, roundIndex: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SaveRoutesRequest) => saveRoutes(tripId, roundIndex, body),
    onSuccess: () => invalidateSplit(queryClient, tripId),
  })
}

export function useCheckTiming(tripId: string) {
  return useMutation({
    mutationFn: (body: CheckTimingRequest) => checkTiming(tripId, body),
  })
}

/** Confirm one round (US-049): organizer-only write, server revalidates timing. */
export function useConfirmDraft(tripId: string, roundIndex: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (draftVersion: number) => confirmSplitDraft(tripId, roundIndex, draftVersion),
    onSuccess: () => invalidateSplit(queryClient, tripId),
  })
}

/** Cancel the initiator's unconfirmed round (US-050); the row becomes replaceable afterwards. */
export function useCancelDraft(tripId: string, roundIndex: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (draftVersion: number) => cancelSplitDraft(tripId, roundIndex, draftVersion),
    onSuccess: () => invalidateSplit(queryClient, tripId),
  })
}

/**
 * Member-readable budget check for the current draft (US-045). Keyed by the draft version so any edit (regenerate,
 * activities, assignment) fetches a fresh projection; enabled only once a draft snapshot exists.
 */
export function useBudgetCheck(tripId: string, roundIndex: number, draftVersion: number | null | undefined) {
  return useQuery({
    queryKey: [BUDGET_KEY, tripId, roundIndex, draftVersion ?? 0],
    queryFn: () => fetchBudgetCheck(tripId, roundIndex),
    enabled: tripId.length > 0 && draftVersion != null,
  })
}

/** Replaces one group's costed activities (US-045); refresh both the round and the budget check on success. */
export function useSaveActivities(tripId: string, roundIndex: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SaveActivitiesRequest) => saveActivities(tripId, roundIndex, body),
    onSuccess: () => invalidateSplit(queryClient, tripId),
  })
}

/** Cancel a confirmed round before departure (US-051); organizer-only write. */
export function useCancelConfirmedSplit(tripId: string, roundIndex: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (draftVersion: number) => cancelConfirmedSplit(tripId, roundIndex, draftVersion),
    onSuccess: () => invalidateSplit(queryClient, tripId),
  })
}

/** Trip projection for the organizer check used by the confirmed-cancel action. */
export function useTripOrganizer(tripId: string) {
  return useQuery({
    queryKey: ["trip-organizer", tripId],
    queryFn: async () => (await api<Trip>(`/api/trips/${tripId}`)).data,
    enabled: tripId.length > 0,
  })
}
