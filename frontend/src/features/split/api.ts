import { csrfHeaders } from "../../lib/csrf"
import type {
  BoundaryResult,
  CheckTimingRequest,
  Envelope,
  GenerateRoutesRequest,
  RouteGenerationResult,
  SaveBoundariesRequest,
  SplitDraftDetail,
  SplitDraftDocument,
  SplitErrorDetails,
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
    const code = envelope?.error?.code ?? "UNKNOWN"
    const message = envelope?.error?.message ?? `HTTP ${response.status}`
    throw new SplitApiError(code, message, response.status, envelope?.error?.details ?? null)
  }
  // 2xx: data may legitimately be null (empty draft state, spec D2).
  return (envelope?.data ?? null) as T
}

/** GET member-only draft snapshot; resolves null when the trip has no active draft (spec D2). */
export function fetchDraftDetail(tripId: string): Promise<SplitDraftDetail | null> {
  return request<SplitDraftDetail | null>(`/${tripId}/split-draft`)
}

/** POST start the trip's unique draft (spec REQ-004). */
export function startDraft(tripId: string): Promise<SplitDraftDocument> {
  return request<SplitDraftDocument>(`/${tripId}/split-draft`, { method: "POST" })
}

/** PUT save the departure/reunion boundary pair (spec REQ-005). */
export function saveBoundaries(tripId: string, body: SaveBoundariesRequest): Promise<BoundaryResult> {
  return request<BoundaryResult>(`/${tripId}/split-draft/boundaries`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

/** POST generate the paired group routes (spec REQ-006). */
export function generateRoutes(tripId: string, body: GenerateRoutesRequest): Promise<RouteGenerationResult> {
  return request<RouteGenerationResult>(`/${tripId}/split-draft/routes:generate`, {
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

/** POST confirm the current draft as the trip's split (US-049); organizer only, server revalidates. */
export function confirmSplitDraft(tripId: string, draftVersion: number): Promise<SplitDraftDetail> {
  return request<SplitDraftDetail>(`/${tripId}/split-draft:confirm`, {
    method: "POST",
    body: JSON.stringify({ draftVersion }),
  })
}

/** POST cancel the initiator's unconfirmed draft (US-050); frees the row for a replacement. */
export function cancelSplitDraft(tripId: string, draftVersion: number): Promise<SplitDraftDetail> {
  return request<SplitDraftDetail>(`/${tripId}/split-draft:cancel`, {
    method: "POST",
    body: JSON.stringify({ draftVersion }),
  })
}

/** POST cancel a confirmed split before departure (US-051); organizer only. */
export function cancelConfirmedSplit(tripId: string, draftVersion: number): Promise<SplitDraftDetail> {
  return request<SplitDraftDetail>(`/${tripId}/split:cancel`, {
    method: "POST",
    body: JSON.stringify({ draftVersion }),
  })
}