// Wire types for the main-itinerary screens (US-031-037), aligned with the
// backend records: TripResponse, InputsResponse, PlanResponse and the
// MainPlanErrorAdvice {code, message, ...detail} body (design D10/D11).
// Only the fields these two screens consume are listed for the trip detail.

export interface TripSummary {
  id: number
  name: string
  destination: string
  startDate: string
  organizerId: number
  // Set by US-037's confirmation; a confirmed plan cannot be regenerated.
  mainPlanConfirmed?: boolean
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
  // Screen 9 display layer: interest labels behind the codes, and the must-do items with owners.
  commonInterestLabels: string[]
  mustDoItems: InputMustDo[]
  // Error bodies also carry message; the screens fall back across results.
  message?: string
}

export interface InputMember {
  userId: number
  displayName: string
  ready: boolean
  preferenceRevision: number
  // US-026: a ready member may have chosen "no preference", which contributes default values.
  noPreference: boolean
}

// Absent (not just null) fields are omitted by the backend's non-null serialisation.
export interface InputBudget {
  userId: number
  displayName: string
  hardBudgetCents?: number | null
  amount?: number | null
  currency?: string | null
  limitType?: 'hard' | 'soft' | null
}

export interface InputMustDo {
  activity: string
  location?: string | null
  memberNames: string[]
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
  // Persisted main_plan_stop row id (US-090 「我的方案」edit target).
  id?: number
  seq: number
  name: string
  startTime: string
  endTime: string
  // Edited display location; absent for plans generated before US-090.
  locationName?: string | null
  travelMinutesToNext: number | null
  interests: string[]
  // US-079 路线1：落库地址/坐标；后端非空序列化会省略 null，故可选。
  address?: string | null
  lat?: number | null
  lng?: number | null
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

// ApiResult/ApiError envelopes come from the shared src/types.ts (api.ts).
// The screens call api<MainPlan & MainPlanError>() so the detail fields
// (pendingMembers/scheduleErrors/overruns) are readable without a cast.