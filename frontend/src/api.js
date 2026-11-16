const USERS = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Ben' },
  { id: 3, name: 'Chloe' },
  { id: 4, name: 'Daniel' },
  { id: 5, name: 'Eve' },
]

export function users() {
  return USERS
}

export async function api(path, { userId, method = 'GET', body } = {}) {
  const headers = {}
  if (userId != null) headers['X-User-Id'] = String(userId)
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }
  return { status: response.status, ok: response.ok, data }
}

// Main itinerary (US-031-037): the four contractual calls, same fetch helper
// and X-User-Id identity as the rest of the app.
export function getMainPlanInputs(tripId, userId) {
  return api(`/api/trips/${tripId}/main-plan/inputs`, { userId })
}

export function generateMainPlan(tripId, userId) {
  return api(`/api/trips/${tripId}/main-plan`, { userId, method: 'POST' })
}

export function getMainPlan(tripId, userId) {
  return api(`/api/trips/${tripId}/main-plan`, { userId })
}

export function confirmMainPlan(tripId, userId) {
  return api(`/api/trips/${tripId}/main-plan/confirm`, { userId, method: 'POST' })
}