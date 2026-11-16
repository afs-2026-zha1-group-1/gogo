import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { checkTiming, fetchDraftDetail, generateRoutes, saveBoundaries, startDraft } from "./api"
import type { CheckTimingRequest, GenerateRoutesRequest, SaveBoundariesRequest } from "./types"
import { useIdentity } from "./identity"

/**
 * TanStack Query v5 data hooks (design D15 / DR-06). All four screens share the member-only GET
 * detail snapshot, polled with refetchInterval so a concurrent initiator's changes surface without
 * a manual reload. The query key includes memberId, so switching identity refetches and exposes the
 * permission states. Mutations invalidate the detail query on success; check-timing is read-only
 * (no persistence) so it does not invalidate. Judgments stay on the backend.
 */
const DETAIL_KEY = "split-draft"
const POLL_MS = 5000

export function useSplitDraft(tripId: string) {
  const { memberId } = useIdentity()
  return useQuery({
    queryKey: [DETAIL_KEY, tripId, memberId],
    queryFn: () => fetchDraftDetail(tripId, memberId),
    enabled: tripId.length > 0,
    refetchInterval: POLL_MS,
  })
}

export function useStartDraft(tripId: string) {
  const { memberId } = useIdentity()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => startDraft(tripId, memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DETAIL_KEY, tripId, memberId] }),
  })
}

export function useSaveBoundaries(tripId: string) {
  const { memberId } = useIdentity()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SaveBoundariesRequest) => saveBoundaries(tripId, memberId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DETAIL_KEY, tripId, memberId] }),
  })
}

export function useGenerateRoutes(tripId: string) {
  const { memberId } = useIdentity()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: GenerateRoutesRequest) => generateRoutes(tripId, memberId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DETAIL_KEY, tripId, memberId] }),
  })
}

export function useCheckTiming(tripId: string) {
  const { memberId } = useIdentity()
  return useMutation({
    mutationFn: (body: CheckTimingRequest) => checkTiming(tripId, memberId, body),
  })
}