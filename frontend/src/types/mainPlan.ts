// Wire types for the main-itinerary screens (US-031-037), aligned with the
// backend records: TripResponse, InputsResponse, PlanResponse and the
// MainPlanErrorAdvice {code, message, ...detail} body (design D10/D11).
// Only the fields these two screens consume are listed for the trip detail.

export interface TripSummary {
  id: number
  name: string
  startDate: string
  organizerId: number
  // Error bodies also carry message; the screens fall back across results.
  message?: string
}

export interface MainPlanInputs {
  tripId: number
  readyCount: number
  memberCount: number
  members: InputMember[]
  commonInterests: string[]
  mustDo: string[]
  budgets: InputBudget[]
  rules: string[]
  // Error bodies also carry message; the screens fall back across results.
  message?: string
}

export interface InputMember {
  userId: number
  displayName: string
  ready: boolean
  preferenceRevision: number
}

export interface InputBudget {
  userId: number
  displayName: string
  hardBudgetCents: number | null
}

export interface MainPlan {
  tripId: number
  version: number
  confirmed: boolean
  stale: boolean
  costPerPersonCents: number
  inputRevisions: PlanInputRevision[]
  stops: PlanStop[]
  // Error bodies also carry message; the screens fall back across results.
  message?: string
}

export interface PlanInputRevision {
  userId: number
  revision: number
}

export interface PlanStop {
  seq: number
  name: string
  startTime: string
  endTime: string
  travelMinutesToNext: number | null
  interests: string[]
}

export interface PendingMember {
  userId: number
  displayName: string
}

export interface ScheduleError {
  type: string
  seq: number
  message: string
}

export interface BudgetOverrun {
  userId: number
  displayName: string
  hardBudgetCents: number
  overrunCents: number
}

// Error body: {code, message} plus the contractual detail fields carried by
// MEMBERS_NOT_READY (pendingMembers) and VALIDATION_FAILED (the two lists).
export interface MainPlanError {
  code: string
  message: string
  pendingMembers?: PendingMember[]
  scheduleErrors?: ScheduleError[]
  overruns?: BudgetOverrun[]
}

// Shape returned by the shared api.js fetch helper, discriminated on ok:
// a 2xx body is the success projection, a non-2xx body is {code, message}
// plus detail. The single boundary cast lives in typed() (apiResult.ts).
export type ApiResult<T> =
  | { status: number; ok: true; data: T }
  | { status: number; ok: false; data: MainPlanError | null }