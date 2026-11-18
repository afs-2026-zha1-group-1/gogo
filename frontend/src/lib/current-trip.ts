import { api } from '../api'
import type { CurrentTripResponse } from '../types'

export function isCurrentTripResponse(value: unknown): value is CurrentTripResponse {
  if (typeof value !== 'object' || value === null || !('tripId' in value)) return false
  const tripId = value.tripId
  return tripId === null || (typeof tripId === 'number' && Number.isSafeInteger(tripId) && tripId > 0)
}

/**
 * US-090: creation and invitation acceptance make the new trip the member's current trip, replacing whatever
 * was selected before. Never throws: the caller keeps going and only reports the switch when it failed.
 */
export async function persistCurrentTrip(tripId: number): Promise<boolean> {
  try {
    const result = await api<CurrentTripResponse>('/api/trips/current', {
      method: 'PUT',
      body: { tripId },
    })
    return result.ok
  } catch {
    return false
  }
}
