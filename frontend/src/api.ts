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

export interface IssuedInvitation {
  token: string
  joinPath: string
  tripId: number
  tripName: string
}

export interface InvitationPreview {
  tripName: string
  destination: string
  startDate: string
  endDate: string
  mainPlanConfirmed: boolean
}

export interface JoinResult {
  joined: boolean
  alreadyMember: boolean
}

export interface ApiErrorResponse {
  code?: string
  message?: string
}

export interface ApiOptions {
  userId?: number
  method?: RequestInit['method']
  body?: unknown
}

export type ApiResult<T> =
  | { status: number; ok: true; data: T | null }
  | { status: number; ok: false; data: ApiErrorResponse | null }

const USERS: User[] = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Ben' },
  { id: 3, name: 'Chloe' },
  { id: 4, name: 'Daniel' },
  { id: 5, name: 'Eve' },
]

export function users(): User[] {
  return USERS
}

export async function api<T = unknown>(
  path: string,
  { userId, method = 'GET', body }: ApiOptions = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {}
  if (userId != null) headers['X-User-Id'] = String(userId)
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }
  if (response.ok) {
    return { status: response.status, ok: true, data: data as T | null }
  }
  return { status: response.status, ok: false, data: data as ApiErrorResponse | null }
}

export function errorMessage(cause: unknown): string | undefined {
  if (typeof cause === 'object' && cause !== null && 'message' in cause) {
    return cause.message === undefined ? undefined : String(cause.message)
  }
  return undefined
}