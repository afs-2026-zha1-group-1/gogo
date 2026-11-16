const CSRF_COOKIE = 'XSRF-TOKEN'

export function readCsrfToken(): string | null {
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CSRF_COOKIE}=`))
  return match ? decodeURIComponent(match.slice(CSRF_COOKIE.length + 1)) : null
}

export async function ensureCsrf(): Promise<string | null> {
  let token = readCsrfToken()
  if (token) return token
  await fetch('/api/auth/csrf', { credentials: 'same-origin' })
  token = readCsrfToken()
  return token
}

export async function csrfHeaders(headers: Record<string, string>): Promise<void> {
  const token = await ensureCsrf()
  if (token) headers['X-XSRF-TOKEN'] = token
}
