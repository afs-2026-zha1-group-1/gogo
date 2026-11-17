import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  if (status === 'checking') {
    return (
      <div className="screen">
        <div className="body"><div className="loading">正在验证登录…</div></div>
      </div>
    )
  }
  if (status !== 'signedIn') return <Navigate to="/login" replace />
  return <>{children}</>
}
