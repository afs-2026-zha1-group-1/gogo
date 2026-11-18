import { csrfHeaders } from "../../lib/csrf"
import type {
  AssignmentRequest,
  BoundaryResult,
  BudgetCheck,
  CheckTimingRequest,
  Envelope,
  GenerateRoutesRequest,
  RouteGenerationResult,
  SaveActivitiesRequest,
  SaveBoundariesRequest,
  SaveRoutesRequest,
  SplitDraftDetail,
  SplitDraftDocument,
  SplitErrorDetails,
  SplitRoundCreatedResult,
  SplitRoundsResponse,
  TimingResult,
} from "./types"

/**
 * Thin fetch client for the five splits endpoints. Identity comes from the authenticated session
 * cookie; the {data,error} envelope is unwrapped here. A non-2xx response throws SplitApiError with
 * the stable error.code so screens can render the matching error/permission state.
 */
export class SplitApiError extends Error {
  readonly code: string
  readonly status: number
  readonly details: SplitErrorDetails | null

  constructor(code: string, message: string, status: number, details: SplitErrorDetails | null = null) {
    super(message)
    this.name = "SplitApiError"
    this.code = code
    this.status = status
    this.details = details
  }
}

const BASE = "/api/trips"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {}
  if (init?.body != null) headers["Content-Type"] = "application/json"
  if (init?.method && init.method !== "GET") await csrfHeaders(headers)

  const response = await fetch(`${BASE}${path}`, { ...init, headers, credentials: "same-origin" })
  let envelope: Envelope<T> | null = null
  try {
    envelope = (await response.json()) as Envelope<T>
  } catch {
    envelope = null
  }

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new Event("gogo:unauthorized"))
    }
    const code = envelope?.error?.code ?? (response.status === 404 ? "ENDPOINT_NOT_FOUND" : "UNKNOWN")
    const message = envelope?.error?.message ?? `HTTP ${response.status}`
    throw new SplitApiError(code, message, response.status, envelope?.error?.details ?? null)
  }
  // 2xx: data may legitimately be null (empty draft state, spec D2).
  return (envelope?.data ?? null) as T
}

/** GET member-only draft snapshot; resolves null when the trip has no active draft (spec D2). */
export function fetchDraftDetail(tripId: string, roundIndex?: number): Promise<SplitDraftDetail | null> {
  if (roundIndex != null) {
    return request<SplitDraftDetail | null>(`/${tripId}/split-draft/rounds/${roundIndex}`)
  }
  return request<SplitDraftDetail | null>(`/${tripId}/split-draft`)
}

/** GET all rounds plus the derived aggregate status (US-096). */
export function fetchRounds(tripId: string): Promise<SplitRoundsResponse> {
  return request<SplitRoundsResponse>(`/${tripId}/split-draft/rounds`)
}

/** POST start the trip's unique draft (spec REQ-004). */
export function startDraft(tripId: string): Promise<SplitDraftDocument> {
  return request<SplitDraftDocument>(`/${tripId}/split-draft`, { method: "POST" })
}

/** POST start the next split round (US-096). */
export function startNextRound(tripId: string): Promise<SplitRoundCreatedResult> {
  return request<SplitRoundCreatedResult>(`/${tripId}/split-draft/rounds`, { method: "POST" })
}

/** PUT save the departure/reunion boundary pair for one round. */
export function saveBoundaries(tripId: string, roundIndex: number, body: SaveBoundariesRequest): Promise<BoundaryResult> {
  return request<BoundaryResult>(`/${tripId}/split-draft/rounds/${roundIndex}/boundaries`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

/** PUT move the caller into the target group for one round (US-040 A1-A9). */
export function assignGroup(tripId: string, roundIndex: number, body: AssignmentRequest): Promise<SplitDraftDetail> {
  return request<SplitDraftDetail>(`/${tripId}/split-draft/rounds/${roundIndex}/assignment`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

/** PUT save the full A/B route pair for one round (US-087 S2). */
export function saveRoutes(tripId: string, roundIndex: number, body: SaveRoutesRequest): Promise<RouteGenerationResult> {
  return request<RouteGenerationResult>(`/${tripId}/split-draft/rounds/${roundIndex}/routes`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

/** POST generate the paired group routes for one round (spec REQ-006). */
export function generateRoutes(tripId: string, roundIndex: number, body: GenerateRoutesRequest): Promise<RouteGenerationResult> {
  return request<RouteGenerationResult>(`/${tripId}/split-draft/rounds/${roundIndex}/routes:generate`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

/** POST check the reunion timing window against an explicit two-route snapshot (spec REQ-007). */
export function checkTiming(tripId: string, body: CheckTimingRequest): Promise<TimingResult> {
  return request<TimingResult>(`/${tripId}/split-draft/routes:check-timing`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

/** POST confirm one round as effective (US-049); organizer only, server revalidates. */
export function confirmSplitDraft(tripId: string, roundIndex: number, draftVersion: number): Promise<SplitDraftDetail> {
  return request<SplitDraftDetail>(`/${tripId}/split-draft/rounds/${roundIndex}:confirm`, {
    method: "POST",
    body: JSON.stringify({ draftVersion }),
  })
}

/** POST cancel one active round (US-050); frees the row for a replacement. */
export function cancelSplitDraft(tripId: string, roundIndex: number, draftVersion: number): Promise<SplitDraftDetail> {
  return request<SplitDraftDetail>(`/${tripId}/split-draft/rounds/${roundIndex}:cancel`, {
    method: "POST",
    body: JSON.stringify({ draftVersion }),
  })
}

/** GET one round's member-readable budget check (US-045). */
export function fetchBudgetCheck(tripId: string, roundIndex: number): Promise<BudgetCheck> {
  return request<BudgetCheck>(`/${tripId}/split-draft/rounds/${roundIndex}/budget-check`)
}

/** PUT replace one group's costed activities for one round (US-045). */
export function saveActivities(tripId: string, roundIndex: number, body: SaveActivitiesRequest): Promise<SplitDraftDetail> {
  return request<SplitDraftDetail>(`/${tripId}/split-draft/rounds/${roundIndex}/activities`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

/** POST cancel one confirmed round before departure (US-051); organizer only. */
export function cancelConfirmedSplit(tripId: string, roundIndex: number, draftVersion: number): Promise<SplitDraftDetail> {
  return request<SplitDraftDetail>(`/${tripId}/split-draft/rounds/${roundIndex}:cancel-confirmed`, {
    method: "POST",
    body: JSON.stringify({ draftVersion }),
  })
}