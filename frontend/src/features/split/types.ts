/**
 * Frontend contract types mirroring the backend splits DTOs (design D15: TS types align with dto records).
 * The backend is authoritative for every judgment; these shapes only describe what it returns.
 * Times are ISO-8601 UTC strings; minutes are whole numbers. `error.code` is the stable contract.
 */

/** One route's machine-readable rejection detail (backend error.details.routes[]). */
export interface RouteErrorDetail {
  groupLabel: string
  totalMinutes: number | null
  overrunMinutes: number | null
  missingInputs: string[]
}

/** Machine-readable rejection details (backend ApiResponse.ApiError.details). */
export interface SplitErrorDetails {
  routes?: RouteErrorDetail[]
  missing?: string[]
}

/** Rejection detail (backend ApiResponse.ApiError). */
export interface ApiErrorPayload {
  code: string
  message: string
  details?: SplitErrorDetails | null
}

/** Draft lifecycle status (US-049/050): only `active` accepts edits/confirm/cancel. */
export type SplitDraftStatus = "active" | "confirmed" | "cancelled"

/** Saved boundary shape (US-095): stop→stop, or trip start→stop. */
export type SplitBoundaryMode = "MIDDLE" | "FROM_START"

/** Unified {data,error} envelope (backend ApiResponse<T>). */
export interface Envelope<T> {
  data: T | null
  error: ApiErrorPayload | null
}

/** Confirmed main-plan stop (backend PlanStop); single source of truth for boundary times. */
export interface PlanStop {
  id: string
  name: string
  startAt: string | null
  endAt: string | null
}

/** Per-group duration breakdown (backend SplitDraftDocument.RouteDurations); nullable estimates. */
export interface RouteDurations {
  activityMinutes: number | null
  travelLegsMinutes: number[]
  bufferMinutes: number | null
  /** Ordered stops for group A (US-089); nullable for legacy documents. */
  steps?: RouteStep[] | null
}

/** One visible step of a branch route (backend RouteStep); group A follows the main-plan stops. */
export interface RouteStep {
  name: string
  minutes: number
}

/** One group's route view (backend GroupRoute), shared by generation response and detail snapshot. */
export interface GroupRoute {
  groupLabel: string
  activityName: string | null
  /** Editable display location (US-087 additive); legacy generated rows backfill the activity name. */
  locationName?: string | null
  departureStopId: string | null
  reunionStopId: string | null
  activityMinutes: number | null
  travelLegsMinutes: number[]
  bufferMinutes: number | null
  steps?: RouteStep[] | null
}

/** Draft document returned by POST start (backend SplitDraftDocument). */
export interface SplitDraftDocument {
  initiatorMemberId: string
  mainPlanVersion: number
  draftVersion: number
  status: SplitDraftStatus
  departureStopId: string | null
  reunionStopId: string | null
  groups: Record<string, string[]>
  routes: Record<string, RouteDurations> | null
  createdAt: string
  updatedAt: string
}

/** Member-only consistent snapshot returned by GET detail (backend SplitDraftDetailResponse). */
export interface SplitDraftDetail {
  initiatorMemberId: string
  mainPlanVersion: number
  draftVersion: number
  status: SplitDraftStatus
  /** Saved boundary shape; null before boundaries are selected (US-095). */
  splitMode: SplitBoundaryMode | null
  groups: Record<string, string[]>
  createdAt: string
  updatedAt: string
  mainPlanStops: PlanStop[]
  departureStopId: string | null
  reunionStopId: string | null
  departureAt: string | null
  reunionAt: string | null
  windowMinutes: number | null
  routes: GroupRoute[]
  /** Trip destination; the screens use it to render instants in the trip's own zone. */
  destination: string | null
}

/** Boundary save response (backend BoundaryResponse). */
export interface BoundaryResult {
  splitMode: SplitBoundaryMode
  departureStopId: string | null
  reunionStopId: string | null
  departureAt: string
  reunionAt: string
  windowMinutes: number
  draftVersion: number
}

/** Paired generation response (backend RouteGenerationResponse). */
export interface RouteGenerationResult {
  draftVersion: number
  routes: GroupRoute[]
}

/** One group's timing inputs (backend RouteTimingInput); nullable so missing inputs are detectable. */
export interface RouteTimingInput {
  groupLabel: string
  activityMinutes: number | null
  travelLegsMinutes: (number | null)[] | null
  bufferMinutes: number | null
}

/** Timing check request body (backend CheckTimingRequest). */
export interface CheckTimingRequest {
  windowMinutes: number
  routes: RouteTimingInput[]
}

/** One group's timing outcome (backend RouteTimingResult); totals null when an input is missing. */
export interface RouteTimingResult {
  groupLabel: string
  totalMinutes: number | null
  overrunMinutes: number | null
  missingInputs: string[]
  feasible: boolean
}

/** Whole-pair timing outcome (backend TimingResult); feasible aggregates every route. */
export interface TimingResult {
  windowMinutes: number
  feasible: boolean
  routes: RouteTimingResult[]
}

/**
 * PUT .../split-draft/assignment body (US-040 A1-A3 + revision 2026-11-17, design DD16).
 * memberId names the member being moved (any trip member may move any member); omitted = the caller.
 */
export interface AssignmentRequest {
  memberId?: string
  groupLabel: "A" | "B"
  draftVersion: number
}

/** POST :confirm / :cancel body (backend DraftVersionRequest). */
export interface DraftVersionRequest {
  draftVersion: number
}

/** PUT boundaries body (backend SaveBoundariesRequest). */
export interface SaveBoundariesRequest {
  departureStopId: string | null
  reunionStopId: string | null
  draftVersion: number
}

/** POST routes:generate body (backend GenerateRoutesRequest). */
export interface GenerateRoutesRequest {
  draftVersion: number
}

/** One editable station (US-087 Revision 3): both groups own their stop names and stay minutes. */
export interface RouteStepInput {
  name: string
  minutes: number | null
}

/** One editable group route in a PUT .../split-draft/routes request (spec US-087 Revision 3). */
export interface RouteEditInput {
  groupLabel: "A" | "B"
  steps: RouteStepInput[]
  /** Group A: one leg after every stop; group B: outbound + return around the stops (stops + 1). */
  travelLegsMinutes: (number | null)[]
}

/** PUT .../split-draft/routes body (backend SaveRoutesRequest). */
export interface SaveRoutesRequest {
  draftVersion: number
  routes: RouteEditInput[]
}