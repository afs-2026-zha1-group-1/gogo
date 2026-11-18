import type { CurrentTripResponse } from '../types'

export function isCurrentTripResponse(value: unknown): value is CurrentTripResponse {
  if (typeof value !== 'object' || value === null || !('tripId' in value)) return false
  const tripId = value.tripId
  return tripId === null || (typeof tripId === 'number' && Number.isSafeInteger(tripId) && tripId > 0)
}
