import { request } from './client'
import type { PreferencesResponse, SavePreferencesResponse } from '../types/preferences'

export function fetchPreferences(tripId: number, userId: number): Promise<PreferencesResponse> {
  return request<PreferencesResponse>(`/api/trips/${tripId}/preferences`, { userId })
}

export function savePreferences(
  tripId: number,
  userId: number,
  interests: string[],
): Promise<SavePreferencesResponse> {
  return request<SavePreferencesResponse>(`/api/trips/${tripId}/preferences`, {
    method: 'PUT',
    userId,
    body: { interests },
  })
}
