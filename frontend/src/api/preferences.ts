import { api } from '../api'
import type { PreferencesResponse, SavePreferencesResponse } from '../types/preferences'

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
