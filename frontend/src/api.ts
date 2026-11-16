import type { ApiError, ApiResult } from './types'
import { csrfHeaders } from './lib/csrf'

export interface ApiOptions {
  method?: string
  body?: unknown
}

export async function api<T = Record<string, never>>(
  path: string,
  { method = 'GET', body }: ApiOptions = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET' && method !== 'HEAD') await csrfHeaders(headers)
  const response = await fetch(path, {
    method,
    headers,
    credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }
  if (response.status === 401 && path !== '/api/auth/me' && path !== '/api/auth/login') {
    window.dispatchEvent(new Event('gogo:unauthorized'))
  }
  return {
    status: response.status,
    ok: response.ok,
    data: data as (T & ApiError) | null,
  }
}
