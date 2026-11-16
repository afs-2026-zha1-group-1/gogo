import type {
  BoundaryResult,
  CheckTimingRequest,
  Envelope,
  GenerateRoutesRequest,
  RouteGenerationResult,
  SaveBoundariesRequest,
  SplitDraftDetail,
  SplitDraftDocument,
  TimingResult,
} from "./types"

/**
 * Thin fetch client for the five splits endpoints (design D15). Every call carries the given
 * X-Member-Id (DR-05 trust, no signature). The {data,error} envelope is unwrapped here; a non-2xx
 * response throws SplitApiError with the stable error.code so screens can render the matching
 * error/permission state. No judgment lives here — the backend decides uniqueness/confirmation/
 * window legality/feasibility.
 */
export class SplitApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = "SplitApiError"
    this.code = code
    this.status = status
  }
}

const BASE = "/api/trips"

async function request<T>(path: string, memberId: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {}
  if (memberId) headers["X-Member-Id"] = memberId
  if (init?.body != null) headers["Content-Type"] = "application/json"

  const response = await fetch(`${BASE}${path}`, { ...init, headers })
  let envelope: Envelope<T> | null = null
  try {
    envelope = (await response.json()) as Envelope<T>
  } catch {
    envelope = null
  }

  if (!response.ok) {
    const code = envelope?.error?.code ?? "UNKNOWN"
    const message = envelope?.error?.message ?? `HTTP ${response.status}`
    throw new SplitApiError(code, message, response.status)
  }
  // 2xx: data may legitimately be null (empty draft state, spec D2).
  return (envelope?.data ?? null) as T
}

/** GET member-only draft snapshot; resolves null when the trip has no active draft (spec D2). */
export function fetchDraftDetail(tripId: string, memberId: string): Promise<SplitDraftDetail | null> {
  return request<SplitDraftDetail | null>(`/${tripId}/split-draft`, memberId)
}

/** POST start the trip's unique draft (spec REQ-004). */
export function startDraft(tripId: string, memberId: string): Promise<SplitDraftDocument> {
  return request<SplitDraftDocument>(`/${tripId}/split-draft`, memberId, { method: "POST" })
}

/** PUT save the departure/reunion boundary pair (spec REQ-005). */
export function saveBoundaries(
  tripId: string,
  memberId: string,
  body: SaveBoundariesRequest,
): Promise<BoundaryResult> {
  return request<BoundaryResult>(`/${tripId}/split-draft/boundaries`, memberId, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

/** POST generate the paired group routes (spec REQ-006). */
export function generateRoutes(
  tripId: string,
  memberId: string,
  body: GenerateRoutesRequest,
): Promise<RouteGenerationResult> {
  return request<RouteGenerationResult>(`/${tripId}/split-draft/routes:generate`, memberId, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

/** POST check the reunion timing window against an explicit two-route snapshot (spec REQ-007). */
export function checkTiming(
  tripId: string,
  memberId: string,
  body: CheckTimingRequest,
): Promise<TimingResult> {
  return request<TimingResult>(`/${tripId}/split-draft/routes:check-timing`, memberId, {
    method: "POST",
    body: JSON.stringify(body),
  })
}