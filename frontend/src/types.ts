export interface User {
  id: number
  name: string
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

export interface ApiResult<T> {
  status: number
  ok: boolean
  data: (T & ApiError) | null
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

export type InAppPage = Exclude<Route['page'], 'join'>