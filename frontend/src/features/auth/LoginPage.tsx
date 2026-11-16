import { useEffect, useState } from 'react'
import Icon from '../../Icons'
import { useAuth } from './AuthProvider'

export default function LoginPage() {
  const { status, pendingInvite, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (status === 'signedIn' && !pendingInvite) window.location.assign('/')
  }, [status, pendingInvite])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await login(email, password)
      if (!result.ok) {
        setError(result.data?.code === 'INVALID_CREDENTIALS'
          ? '邮箱或密码不正确。'
          : '登录失败，请稍后重试。')
        return
      }
      if (!result.data) {
        setError('登录失败，请稍后重试。')
        return
      }
      if (pendingInvite) {
        window.location.assign(`/#/join/${encodeURIComponent(pendingInvite)}`)
      } else {
        window.location.assign('/')
      }
    } catch {
      setError('无法连接服务器，请稍后重试。')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'checking') {
    return (
      <div className="screen">
        <div className="body"><div className="loading">正在验证登录…</div></div>
      </div>
    )
  }

  return (
    <div className="screen">
      <header className="appbar">
        <div className="logo"><Icon name="branch" /></div>
        <div className="grow">
          <div className="title">登录 GOGO</div>
          <div className="sub">使用账号进入你的共享行程</div>
        </div>
      </header>
      <div className="body">
        <section className="card pad" style={{ marginTop: 12 }}>
          <form onSubmit={submit}>
            <div className="field">
              <label className="label" htmlFor="login-email">邮箱</label>
              <input
                id="login-email"
                className="input"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="login-password">密码</label>
              <input
                id="login-password"
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {error && <p role="alert" className="error">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={busy} style={{ marginTop: 8 }}>
              {busy ? '正在登录…' : '登录'}
            </button>
          </form>
        </section>
        <p className="hint" style={{ marginTop: 14 }}>
          登录后会回到你的仪表盘；如果正在打开邀请，会先回到邀请预览，再由你确认加入。
        </p>
      </div>
    </div>
  )
}
