/**
 * Frontend contract types mirroring the backend splits DTOs (design D15: TS types align with dto records).
 * The backend is authoritative for every judgment; these shapes only describe what it returns.
 * Times are ISO-8601 UTC strings; minutes are whole numbers. `error.code` is the stable contract.
 */

/** Rejection detail (backend ApiResponse.ApiError). */
export interface ApiErrorPayload {
  code: string
  message: string
}

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

/** Per-group duration breakdown (backend SplitDraftDocument.RouteDurations). */
export interface RouteDurations {
  activityMinutes: number
  travelLegsMinutes: number[]
  bufferMinutes: number
}

/** One group's route view (backend GroupRoute), shared by generation response and detail snapshot. */
export interface GroupRoute {
  groupLabel: string
  activityName: string | null
  departureStopId: string | null
  reunionStopId: string | null
  activityMinutes: number
  travelLegsMinutes: number[]
  bufferMinutes: number
}

/** Draft document returned by POST start (backend SplitDraftDocument). */
export interface SplitDraftDocument {
  initiatorMemberId: string
  mainPlanVersion: number
  draftVersion: number
  status: string
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
  status: string
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
}

/** Boundary save response (backend BoundaryResponse). */
export interface BoundaryResult {
  departureStopId: string
  reunionStopId: string
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