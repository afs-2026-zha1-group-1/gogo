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