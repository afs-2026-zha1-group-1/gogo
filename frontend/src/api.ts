import type { ApiError, ApiResult, User } from './types'

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

export interface ApiOptions {
  userId?: number
  method?: RequestInit['method']
  body?: unknown
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
  return {
    status: response.status,
    ok: false,
    data: data as (ApiError & Partial<T>) | null,
  }
}

export function errorMessage(cause: unknown): string | undefined {
  if (typeof cause === 'object' && cause !== null && 'message' in cause) {
    return cause.message === undefined ? undefined : String(cause.message)
  }
  return undefined
}