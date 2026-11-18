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
  /** US-045 hard-budget block: one row per member whose hard limit is exceeded. */
  overruns?: BudgetOverrunDetail[]
  remainingSharedCostCents?: number
  replacedCostCents?: number
}

/** One hard-budget overrun row inside the confirmation error details (backend budgetHardOverrunDetails). */
export interface BudgetOverrunDetail {
  memberId: string
  displayName: string | null
  groupLabel: string
  totalCostCents: number
  budgetAmount: number | null
  currency: string | null
  overrunCents: number
}

/** Rejection detail (backend ApiResponse.ApiError). */
export interface ApiErrorPayload {
  code: string
  message: string
  details?: SplitErrorDetails | null
}

/** Draft lifecycle status (US-049/050): only `active` accepts edits/confirm/cancel. */
export type SplitDraftStatus = "active" | "confirmed" | "cancelled"

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
  /** US-045 per-person cost of the shared stop in cents (0 = free). */
  costCents?: number
}

/** Per-group duration breakdown (backend SplitDraftDocument.RouteDurations); nullable estimates. */
export interface RouteDurations {
  activityMinutes: number | null
  travelLegsMinutes: number[]
  bufferMinutes: number | null
}

/** One visible step of a branch route (backend RouteStep); group A follows the main-plan stops. */
export interface RouteStep {
  name: string
  minutes: number
}

/** Where a costed activity came from (backend RouteActivity.source). */
export type ActivitySource = "main" | "ai" | "manual"

/** One costed activity the group pays for (backend RouteActivity, US-045), cost is per person in cents. */
export interface RouteActivity {
  name: string
  location: string | null
  costCents: number
  source: ActivitySource
}

/** One group's route view (backend GroupRoute), shared by generation response and detail snapshot. */
export interface GroupRoute {
  groupLabel: string
  activityName: string | null
  departureStopId: string | null
  reunionStopId: string | null
  activityMinutes: number | null
  travelLegsMinutes: number[]
  bufferMinutes: number | null
  steps?: RouteStep[] | null
  /** US-045 costed activities generated with the route (null on documents created before the feature). */
  activities?: RouteActivity[] | null
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

/** Budget verdict for one member (backend SplitBudgetCalculator status). */
export type BudgetStatus = "within" | "soft_over" | "hard_over" | "no_budget"

/** One member's budget verdict inside a group (backend BudgetCheckResponse.MemberVerdict, US-045). */
export interface BudgetMemberVerdict {
  memberId: string
  displayName: string | null
  budgetAmount: number | null
  currency: string | null
  limitType: "hard" | "soft" | null
  totalCostCents: number
  overrunCents: number
  status: BudgetStatus
}

/** One group's cost projection in the budget check (backend BudgetCheckResponse.GroupBudget). */
export interface GroupBudget {
  groupLabel: string
  memberIds: string[]
  squadCostCents: number
  totalCostCents: number
  members: BudgetMemberVerdict[]
}

/** GET .../split-draft/budget-check (backend BudgetCheckResponse, US-045). */
export interface BudgetCheck {
  draftVersion: number
  totalSharedCostCents: number
  replacedCostCents: number
  remainingSharedCostCents: number
  blocked: boolean
  softReminder: boolean
  groups: GroupBudget[]
}

/** PUT .../split-draft/activities body (backend SaveActivitiesRequest, US-045). */
export interface SaveActivitiesRequest {
  groupLabel: "A" | "B"
  activities: { name: string; location?: string | null; costCents: number }[]
  draftVersion: number
}

/** POST .../split-draft/activities:recommend body (backend RecommendActivitiesRequest, US-045). */
export interface RecommendActivitiesRequest {
  groupLabel: "A" | "B"
  draftVersion: number
}