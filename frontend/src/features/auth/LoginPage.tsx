import { useEffect, useState } from 'react'
import Icon from '../../Icons'
import { useAuth } from './AuthProvider'

const DEMO_PASSWORD = 'gogo-demo-2026'
const DEMO_ACCOUNTS = [
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Ben', email: 'ben@example.com' },
  { name: 'Chloe', email: 'chloe@example.com' },
  { name: 'Daniel', email: 'daniel@example.com' },
  { name: 'Eve', email: 'eve@example.com' },
]

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
      <div className="app">
        <div className="screen">
          <div className="body"><div className="loading">正在验证登录…</div></div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="screen">
        <header className="appbar">
          <div className="logo"><Icon name="branch" /></div>
          <div className="grow">
            <div className="title">我的行程</div>
            <div className="sub">共享旅行，从这里开始</div>
          </div>
        </header>
        <div className="body">
          <section className="hero">
            <div className="htop">
              <Icon name="sparkle" className="sm" />
              GOGO · 一起旅行
            </div>
            <h1>一起出发</h1>
            <div className="hdest">
              <Icon name="pin" className="sm" />
              登录后继续你的共享行程
            </div>
          </section>

          <div className="sec-title"><Icon name="user" className="sm" /> 账号登录</div>
          <section className="card pad">
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

          <div className="sec-title"><Icon name="user" className="sm" /> 演示账号（仅演示）</div>
          <section className="card pad">
            <p className="hint" style={{ marginBottom: 10 }}>
              点击账号自动填入邮箱与统一密码，便于演示登录。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  className="btn btn-ghost sm"
                  type="button"
                  style={{ justifyContent: 'space-between' }}
                  onClick={() => {
                    setEmail(account.email)
                    setPassword(DEMO_PASSWORD)
                    setError('')
                  }}
                >
                  <span>{account.name}</span>
                  <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>{account.email}</span>
                </button>
              ))}
            </div>
            <p className="hint" style={{ marginTop: 10 }}>
              统一密码：<code>{DEMO_PASSWORD}</code>（仅演示环境，不是生产账号目录）
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
