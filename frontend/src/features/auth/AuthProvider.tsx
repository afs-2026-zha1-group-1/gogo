import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../../api'
import { ensureCsrf } from '../../lib/csrf'
import type { ApiResult } from '../../types'
import type { Account } from './types'

const PENDING_KEY = 'gogo.pendingInvite'

type AuthStatus = 'checking' | 'signedIn' | 'signedOut'

interface AuthValue {
  status: AuthStatus
  account: Account | null
  accountId: string | null
  pendingInvite: string | null
  setPendingInvite: (token: string) => void
  clearPendingInvite: () => void
  login: (email: string, password: string) => Promise<ApiResult<Account>>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

function readPending(): string | null {
  try {
    return sessionStorage.getItem(PENDING_KEY)
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [account, setAccount] = useState<Account | null>(null)
  const [pendingInvite, setPendingInviteState] = useState<string | null>(readPending)

  const refresh = useCallback(async () => {
    await ensureCsrf()
    const result = await api<Account>('/api/auth/me')
    if (result.ok && result.data) {
      setAccount(result.data)
      setStatus('signedIn')
    } else {
      setAccount(null)
      setStatus('signedOut')
    }
  }, [])

  useEffect(() => {
    refresh().catch(() => setStatus('signedOut'))
  }, [refresh])

  useEffect(() => {
    const onUnauthorized = () => {
      setAccount(null)
      setStatus('signedOut')
    }
    window.addEventListener('gogo:unauthorized', onUnauthorized)
    return () => window.removeEventListener('gogo:unauthorized', onUnauthorized)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await api<Account>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    if (result.ok && result.data) {
      setAccount(result.data)
      setStatus('signedIn')
    }
    return result
  }, [])

  const setPendingInvite = useCallback((token: string) => {
    setPendingInviteState(token)
    try {
      sessionStorage.setItem(PENDING_KEY, token)
    } catch {
      /* storage unavailable: keep in memory */
    }
  }, [])

  const clearPendingInvite = useCallback(() => {
    setPendingInviteState(null)
    try {
      sessionStorage.removeItem(PENDING_KEY)
    } catch {
      /* storage unavailable */
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        status,
        account,
        accountId: account ? String(account.id) : null,
        pendingInvite,
        setPendingInvite,
        clearPendingInvite,
        login,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
