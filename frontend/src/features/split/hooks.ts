import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { cancelConfirmedSplit, cancelSplitDraft, checkTiming, confirmSplitDraft, fetchDraftDetail, generateRoutes, saveBoundaries, startDraft } from "./api"
import { api } from "../../api"
import type { Trip } from "../../types"
import type { CheckTimingRequest, GenerateRoutesRequest, SaveBoundariesRequest } from "./types"

/**
 * TanStack Query v5 data hooks. The member-only GET detail snapshot is polled so a concurrent
 * initiator's changes surface without a manual reload. Identity comes from the authenticated
 * session cookie; mutations invalidate the detail query on success.
 */
const DETAIL_KEY = "split-draft"
const POLL_MS = 5000

export function useSplitDraft(tripId: string) {
  return useQuery({
    queryKey: [DETAIL_KEY, tripId],
    queryFn: () => fetchDraftDetail(tripId),
    enabled: tripId.length > 0,
    refetchInterval: POLL_MS,
  })
}

export function useStartDraft(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => startDraft(tripId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DETAIL_KEY, tripId] }),
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

/** Cancel a confirmed split before departure (US-051); organizer-only write. */
export function useCancelConfirmedSplit(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (draftVersion: number) => cancelConfirmedSplit(tripId, draftVersion),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DETAIL_KEY, tripId] }),
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
