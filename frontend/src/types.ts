export interface User {
  id: number
  name: string
}

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

export type TabId = 'dashboard' | 'trips' | 'split' | 'members'

export type Route =
  | { page: 'home' }
  | { page: 'trips-empty' }
  | { page: 'create' }
  | { page: 'split' }
  | { page: 'members' }
  | { page: 'details'; tripId: number }
  | { page: 'join'; token: string }
  | { page: 'main-plan'; tripId: number }
  | { page: 'main-plan-inputs'; tripId: number }

// main-plan screens are full-page flows (like join) without the bottom TabBar.
export type InAppPage = Exclude<Route['page'], 'join' | 'main-plan' | 'main-plan-inputs'>