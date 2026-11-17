export interface GreetingResponse {
  message: string
}

export interface TripCreatePayload {
  name: string
  destination: string
  startDate: string
  endDate: string
  startLocation: string
  endLocation: string
}

export interface Trip {
  id: number
  name: string
  destination: string
  startDate: string
  endDate: string
  startLocation: string | null
  endLocation: string | null
  organizerId: number
  mainPlanConfirmed?: boolean
}

export interface InvitationPreview {
  tripName: string
  destination: string
  startDate: string
  endDate: string
  mainPlanConfirmed: boolean
}

export interface AcceptResult {
  joined: boolean
  alreadyMember: boolean
  tripId: number
  tripName: string
}

export interface InvitationIssue {
  token: string
  joinPath: string
  tripId: number
  tripName: string
}

export interface TripMember {
  userId: number
  displayName: string
  organizer: boolean
}

export interface TripMemberList {
  tripId: number
  members: TripMember[]
}

export interface ApiError {
  code?: string
  message?: string
}

export type ApiResult<T> =
  | {
      status: number
      ok: true
      data: T | null
    }
  | {
      status: number
      ok: false
      data: (ApiError & Partial<T>) | null
    }

export type TabId = 'dashboard' | 'trips' | 'split' | 'members' | 'account'

export type Route =
  | { page: 'home' }
  | { page: 'dashboard-trip'; tripId: number | null }
  | { page: 'login' }
  | { page: 'register' }
  | { page: 'account' }
  | { page: 'trips-empty' }
  | { page: 'create' }
  | { page: 'split' }
  | { page: 'members' }
  | { page: 'details'; tripId: number }
  | { page: 'join'; token: string }
  | { page: 'main-plan'; tripId: number; dashboardOrigin?: boolean }
  | { page: 'main-plan-inputs'; tripId: number }
  | { page: 'scan'; from: string | null }
  | { page: 'preferences'; tripId: number; dashboardOrigin?: boolean }

// login, registration, join, main-plan, preference and scan screens are
// full-page flows without the bottom TabBar. 'scan' additionally owns its own
// app-bar close control, so it must not appear in TAB_FOR_PAGE
// (Record<InAppPage, TabId>).
export type InAppPage = Exclude<
  Route['page'],
  'join' | 'login' | 'register' | 'main-plan' | 'main-plan-inputs' | 'scan' | 'preferences'
>
