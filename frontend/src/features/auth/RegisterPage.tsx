import { useEffect, useState } from 'react'
import Icon from '../../Icons'
import { useAuth } from './AuthProvider'

const LOGIN_EMAIL_KEY = 'gogo.login.email'
const NAME_MIN = 1
const NAME_MAX = 30
const PASSWORD_MIN_BYTES = 8
const PASSWORD_MAX_BYTES = 72

interface FieldErrors {
  name?: string
  email?: string
  password?: string
  confirm?: string
}

type DialogKind = 'success' | 'duplicate' | null

function emailError(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
    return '请输入有效的邮箱地址。'
  }
  return undefined
}

function nameError(value: string): string | undefined {
  const trimmed = value.trim()
  const length = Array.from(trimmed).length
  if (length < NAME_MIN || length > NAME_MAX) {
    return '名字需要 1–30 个字符。'
  }
  return undefined
}

function passwordError(value: string): string | undefined {
  const bytes = new TextEncoder().encode(value).length
  if (bytes < PASSWORD_MIN_BYTES || bytes > PASSWORD_MAX_BYTES) {
    return '密码至少需要 8 个字符（最多 72 字节）。'
  }
  return undefined
}

export default function RegisterPage() {
  const { status, register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (status === 'signedIn') window.location.assign('/')
  }, [status])

  function goToLogin() {
    try {
      sessionStorage.setItem(LOGIN_EMAIL_KEY, email.trim())
    } catch {
      /* storage unavailable: still continue to login */
    }
    window.location.assign('/login')
  }

  function editEmail() {
    setDialog(null)
    window.setTimeout(() => document.getElementById('register-email')?.focus(), 0)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setFormError('')
    const nextErrors: FieldErrors = {
      name: nameError(name),
      email: emailError(email),
      password: passwordError(password),
      confirm: confirm !== password ? '两次输入的密码不一致。' : undefined,
    }
    setErrors(nextErrors)
    if (nextErrors.name || nextErrors.email || nextErrors.password || nextErrors.confirm) return

    setBusy(true)
    try {
      const result = await register(email.trim(), name.trim(), password)
      if (!result.ok) {
        const code = result.data?.code
        if (code === 'EMAIL_TAKEN') {
          setDialog('duplicate')
        } else if (code === 'INVALID_EMAIL') {
          setErrors({ email: '请输入有效的邮箱地址。' })
        } else if (code === 'INVALID_NAME') {
          setErrors({ name: '名字需要 1–30 个字符。' })
        } else if (code === 'INVALID_PASSWORD') {
          setErrors({ password: '密码至少需要 8 个字符（最多 72 字节）。' })
        } else {
          setFormError('注册失败，请稍后重试。')
        }
        return
      }
      setDialog('success')
    } catch {
      setFormError('无法连接服务器，请稍后重试。')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'checking') {
    return (
      <div className="app register-app">
        <div className="screen">
          <div className="body"><div className="loading">正在验证登录…</div></div>
        </div>
      </div>
    )
  }

  if (status === 'signedIn') return null

  return (
    <div className="app register-app">
      <div className="screen register-page">
        <header className="reg-top">
          <a className="reg-back" href="/login" aria-label="返回登录">
            <Icon name="left" className="sm" />
          </a>
          <div className="reg-top-title">加入 GoGo</div>
          <span className="reg-step">01 / 开启旅程</span>
        </header>

        <div className="body reg-body">
          <section className="reg-cover" aria-label="GoGo">
            <div className="reg-cover-shade" aria-hidden="true" />
            <div className="reg-brandline">
              <span className="reg-wordmark">gogo.</span>
              <span className="reg-tagline">GOOD DAYS TOGETHER</span>
            </div>
            <span className="reg-cover-star" aria-hidden="true">✳</span>
            <div className="reg-cover-copy">
              <div className="reg-kicker">THE NEXT CHAPTER</div>
              <h1>旅行不只是去哪里，<br />更是和谁一起。</h1>
            </div>
          </section>

          <section className="reg-card">
            <div className="reg-welcome">LET'S GET TOGETHER</div>
            <h2 className="reg-title">从这里，<em>一起出发。</em></h2>
            <p className="reg-sub">只需一分钟，开启属于我们的下一段旅程。</p>

            <ol className="reg-steps" aria-label="注册流程">
              <li className="reg-step-chip on">
                <Icon name="sparkle" className="sm" /> 发起旅行
              </li>
              <li className="reg-step-line" aria-hidden="true" />
              <li className="reg-step-chip">
                <Icon name="users" className="sm" /> 邀请朋友
              </li>
              <li className="reg-step-line" aria-hidden="true" />
              <li className="reg-step-chip">
                <Icon name="nav" className="sm" /> 一起出发
              </li>
            </ol>

            <form onSubmit={submit} noValidate>
              <div className="field">
                <label className="label" htmlFor="register-name">怎么称呼你</label>
                <div className="inp-ic reg-inp">
                  <Icon name="user" />
                  <input
                    id="register-name"
                    className={`input${errors.name ? ' invalid' : ''}`}
                    type="text"
                    autoComplete="nickname"
                    value={name}
                    maxLength={NAME_MAX}
                    placeholder="输入你的昵称"
                    onChange={(event) => {
                      setName(event.target.value)
                      setErrors((current) => ({ ...current, name: undefined }))
                    }}
                    required
                  />
                </div>
                {errors.name && <p className="error">{errors.name}</p>}
              </div>

              <div className="field">
                <label className="label" htmlFor="register-email">邮箱地址</label>
                <div className="inp-ic reg-inp">
                  <Icon name="link" />
                  <input
                    id="register-email"
                    className={`input${errors.email ? ' invalid' : ''}`}
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setErrors((current) => ({ ...current, email: undefined }))
                    }}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                {errors.email && <p className="error">{errors.email}</p>}
              </div>

              <div className="field">
                <label className="label" htmlFor="register-password">设置密码</label>
                <div className="inp-ic reg-inp">
                  <Icon name="lock" />
                  <input
                    id="register-password"
                    className={`input${errors.password ? ' invalid' : ''}`}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    placeholder="至少 8 个字符"
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setErrors((current) => ({ ...current, password: undefined, confirm: undefined }))
                    }}
                    required
                  />
                  <button
                    type="button"
                    className="reg-reveal"
                    aria-label={showPassword ? '隐藏输入内容' : '显示输入内容'}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? '隐藏' : '显示'}
                  </button>
                </div>
                <p className="help reg-help">—— 至少 8 位 · 搭配字母与数字组合</p>
                {errors.password && <p className="error">{errors.password}</p>}
              </div>

              <div className="field">
                <label className="label" htmlFor="register-confirm">再次确认密码</label>
                <div className="inp-ic reg-inp">
                  <Icon name="check" />
                  <input
                    id="register-confirm"
                    className={`input${errors.confirm ? ' invalid' : ''}`}
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirm}
                    placeholder="再输入一次密码"
                    onChange={(event) => {
                      setConfirm(event.target.value)
                      setErrors((current) => ({ ...current, confirm: undefined }))
                    }}
                    required
                  />
                  <button
                    type="button"
                    className="reg-reveal"
                    aria-label={showConfirm ? '隐藏确认输入内容' : '显示确认输入内容'}
                    onClick={() => setShowConfirm((value) => !value)}
                  >
                    {showConfirm ? '隐藏' : '显示'}
                  </button>
                </div>
                {errors.confirm && <p className="error">{errors.confirm}</p>}
              </div>

              <p className="reg-hint">填写完成后即可创建账号</p>
              {formError && <p role="alert" className="error">{formError}</p>}
              <button className="btn btn-primary reg-submit" type="submit" disabled={busy}>
                <span>{busy ? '正在注册…' : '创建账号，开启旅程'}</span>
                <Icon name="right" className="sm" />
              </button>
            </form>

            <p className="reg-alt">
              已经是 GoGo 的朋友？<a href="/login">直接登录</a>
            </p>
          </section>
        </div>
      </div>

      {dialog && (
        <div className="dialog-backdrop">
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="register-dialog-title"
          >
            <div className={`dialog-icon ${dialog === 'success' ? 'ok' : 'warn'}`}>
              <Icon name={dialog === 'success' ? 'check' : 'alert'} />
            </div>
            <div id="register-dialog-title" className="dialog-title">
              {dialog === 'success' ? '注册成功' : '该邮箱已注册'}
            </div>
            <p className="dialog-text">
              {dialog === 'success'
                ? '账号已创建。请使用该邮箱登录。'
                : '这个邮箱已经有账号了，请直接登录，或更换邮箱后重试。'}
            </p>
            <div className="dialog-actions">
              <button className="btn btn-primary" type="button" onClick={goToLogin}>
                去登录
              </button>
              {dialog === 'duplicate' && (
                <button className="btn btn-ghost" type="button" onClick={editEmail}>
                  修改邮箱
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
