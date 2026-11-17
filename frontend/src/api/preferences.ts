import { api } from '../api'
import type {
  BudgetLimitType,
  BudgetsResponse,
  MustDoItem,
  MustDosResponse,
  PreferencesResponse,
  ReadinessResponse,
  SaveBudgetResponse,
  SaveMustDosResponse,
  SavePreferencesResponse,
  SubmissionResponse,
  UserInterestsResponse,
} from '../types/preferences'

/** Thrown by this client so the page can branch on the HTTP status (PAGE-8 copy). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

interface RequestOptions {
  method?: 'GET' | 'PUT'
  body?: unknown
}

// Identity comes from the session cookie and CSRF headers come from lib/csrf via api().
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const result = await api<T>(path, options)
  if (!result.ok) {
    const failure = result.data as { code?: string; message?: string } | null
    throw new ApiError(
      result.status,
      failure?.code ?? `HTTP_${result.status}`,
      failure?.message ?? `请求失败（HTTP ${result.status}）`,
    )
  }
  return result.data as T
}

export function fetchPreferences(tripId: number): Promise<PreferencesResponse> {
  return request<PreferencesResponse>(`/api/trips/${tripId}/preferences`)
}

export function savePreferences(
  tripId: number,
  interests: string[],
): Promise<SavePreferencesResponse> {
  return request<SavePreferencesResponse>(`/api/trips/${tripId}/preferences`, {
    method: 'PUT',
    body: { interests },
  })
}

// US-020: the must-do section's own two calls. A save always replaces the whole list, so the
// page sends the acknowledged items plus the one pending change and adopts the response (MD11).
export function fetchMustDos(tripId: number): Promise<MustDosResponse> {
  return request<MustDosResponse>(`/api/trips/${tripId}/preferences/must-dos`)
}

export function saveMustDos(
  tripId: number,
  items: MustDoItem[],
): Promise<SaveMustDosResponse> {
  return request<SaveMustDosResponse>(`/api/trips/${tripId}/preferences/must-dos`, {
    method: 'PUT',
    body: { items },
  })
}

// US-024: budget lives in its own sub-resource. A null amount clears the budget.
export function fetchBudgets(tripId: number): Promise<BudgetsResponse> {
  return request<BudgetsResponse>(`/api/trips/${tripId}/preferences/budget`)
}

export function saveBudget(
  tripId: number,
  amount: number | null,
  currency?: string,
  limitType?: BudgetLimitType,
): Promise<SaveBudgetResponse> {
  const body = amount === null ? { amount: null } : { amount, currency, limitType }
  return request<SaveBudgetResponse>(`/api/trips/${tripId}/preferences/budget`, {
    method: 'PUT',
    body,
  })
}

// US-026: submit readiness and read readiness for the roster.
export function submitPreferences(tripId: number, noPreference: boolean): Promise<SubmissionResponse> {
  return request<SubmissionResponse>(`/api/trips/${tripId}/preferences/submission`, {
    method: 'PUT',
    body: { noPreference },
  })
}

export function fetchReadiness(tripId: number): Promise<ReadinessResponse> {
  return request<ReadinessResponse>(`/api/trips/${tripId}/preferences/readiness`)
}

// US-019: personal default interests (not trip-scoped).
export function fetchUserInterests(): Promise<UserInterestsResponse> {
  return request<UserInterestsResponse>(`/api/me/preferences`)
}

export function saveUserInterests(interests: string[]): Promise<UserInterestsResponse> {
  return request<UserInterestsResponse>(`/api/me/preferences`, {
    method: 'PUT',
    body: { interests },
  })
}
