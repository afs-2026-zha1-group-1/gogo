import { useEffect, useState } from 'react'
import Icon from '../../Icons'
import { useAuth } from './AuthProvider'

const DEMO_PASSWORD = 'gogo-demo-2026'
const LOGIN_EMAIL_KEY = 'gogo.login.email'
const DEMO_ACCOUNTS = [
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Ben', email: 'ben@example.com' },
  { name: 'Chloe', email: 'chloe@example.com' },
  { name: 'Daniel', email: 'daniel@example.com' },
  { name: 'Eve', email: 'eve@example.com' },
]

/** Only a same-origin in-app path may be resumed after login. */
function resumeTarget(): string | null {
  const raw = new URLSearchParams(window.location.search).get('next')
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null
  try {
    const target = new URL(raw, window.location.origin)
    if (target.origin !== window.location.origin) return null
    if (target.pathname === '/login' || target.pathname === '/register') return null
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return null
  }
}

export default function LoginPage() {
  const { status, pendingInvite, login } = useAuth()
  const [email, setEmail] = useState(() => {
    try {
      const saved = sessionStorage.getItem(LOGIN_EMAIL_KEY)
      if (saved) {
        sessionStorage.removeItem(LOGIN_EMAIL_KEY)
        return saved
      }
    } catch {
      /* storage unavailable */
    }
    return ''
  })
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // 演示账号默认收起，只在演示时展开，主流程保持干净。
  const [showPassword, setShowPassword] = useState(false)
  const [showDemo, setShowDemo] = useState(false)

  useEffect(() => {
    if (status === 'signedIn' && !pendingInvite) window.location.assign(resumeTarget() ?? '/')
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
        window.location.assign(resumeTarget() ?? '/')
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
    <div className="app login-app">
      <div className="screen login-page">
        <div className="body login-body">
          {/* Photo cover keeps the editorial hero; the sign-in card overlaps it below. */}
          <section className="login-cover" aria-label="GoGo">
            <div className="login-cover-shade" aria-hidden="true" />
            <div className="login-brandline">
              <span className="login-wordmark">gogo.</span>
              <span className="login-tagline">THE GOOD DAYS CLUB</span>
            </div>
            <div className="login-cover-copy">
              <div className="login-kicker">SOMEWHERE GOOD, TOGETHER.</div>
              <h1>想去的地方，<br />我们一起走。</h1>
              <p>把每一次期待，变成一起走过的风景。</p>
            </div>
          </section>

          <section className="login-card">
            <div className="login-card-head">
              <div>
                <div className="login-welcome">WELCOME BACK</div>
                <h2>欢迎回来。</h2>
                <p className="login-sub">你的下一站，和朋友们都在这里。</p>
              </div>
              <span className="login-mark" aria-hidden="true">✳</span>
            </div>

            <form onSubmit={submit}>
              <div className="field">
                <label className="label" htmlFor="login-email">邮箱地址</label>
                <div className="inp-ic login-inp">
                  <Icon name="user" />
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
              </div>
              <div className="field">
                <label className="label" htmlFor="login-password">登录密码</label>
                <div className="inp-ic login-inp">
                  <Icon name="lock" />
                  <input
                    id="login-password"
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="输入你的密码"
                    required
                  />
                  <button
                    type="button"
                    className="login-reveal"
                    onClick={() => setShowPassword((value) => !value)}
                    // 不含「密码」二字：避免与密码输入框的无障碍名称冲突（getByLabel 会解析到两个元素）。
                    aria-label={showPassword ? '隐藏输入内容' : '显示输入内容'}
                  >
                    {showPassword ? '隐藏' : '显示'}
                  </button>
                </div>
              </div>
              {error && <p role="alert" className="error">{error}</p>}
              <button className="btn btn-primary login-submit" type="submit" disabled={busy}>
                {busy ? '正在登录…' : (<><span>登录</span><Icon name="right" className="sm" /></>)}
              </button>
            </form>

            <p className="login-alt">
              第一次来 GoGo？<a href="/register">创建账号</a>
            </p>

            <div className={`login-demo${showDemo ? ' open' : ''}`}>
              <button
                type="button"
                className="login-demo-toggle"
                aria-expanded={showDemo}
                aria-controls="login-demo-panel"
                onClick={() => setShowDemo((value) => !value)}
              >
                <Icon name="sparkle" className="sm" />
                <span>想先体验一下？</span>
                <span className="login-demo-action">
                  {showDemo ? '收起演示账号' : '使用演示账号'}
                  <Icon name={showDemo ? 'left' : 'right'} className="sm" />
                </span>
              </button>
              <div className="login-demo-panel" id="login-demo-panel" hidden={!showDemo}>
                <p className="hint">点击一位旅行伙伴，即可自动填入演示账号。</p>
                <div className="login-demo-grid" role="list">
                  {DEMO_ACCOUNTS.map((account) => (
                    <button
                      key={account.email}
                      className="login-demo-tile"
                      type="button"
                      role="listitem"
                      // 只提示名字，不暴露邮箱与密码。
                      aria-label={`使用演示账号 ${account.name}`}
                      onClick={() => {
                        setEmail(account.email)
                        setPassword(DEMO_PASSWORD)
                        setError('')
                      }}
                    >
                      <span className="login-demo-avatar" aria-hidden="true">
                        {account.name.charAt(0)}
                      </span>
                      <span className="login-demo-name">{account.name}</span>
                    </button>
                  ))}
                </div>
                <p className="hint login-demo-note">演示账号 · 不连接真实账号系统</p>
              </div>
            </div>
          </section>

          <p className="login-footnote">GO SOMEWHERE, FEEL TOGETHER. ✳</p>
        </div>
      </div>
    </div>
  )
}
