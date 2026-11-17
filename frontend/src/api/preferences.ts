import { api } from '../api'
import type {
  MustDoItem,
  MustDosResponse,
  PreferencesResponse,
  SaveMustDosResponse,
  SavePreferencesResponse,
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
