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
  userId?: number
  method?: 'GET' | 'PUT' | 'POST'
  body?: unknown
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { userId, method = 'GET', body } = options
  const headers: Record<string, string> = {}
  if (userId != null) headers['X-User-Id'] = String(userId)
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', '无法连接后端服务，请确认已在 8080 端口启动')
  }

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const failure = (payload ?? {}) as { code?: string; message?: string }
    throw new ApiError(
      response.status,
      failure.code ?? `HTTP_${response.status}`,
      failure.message ?? `请求失败（HTTP ${response.status}）`,
    )
  }
  return payload as T
}
