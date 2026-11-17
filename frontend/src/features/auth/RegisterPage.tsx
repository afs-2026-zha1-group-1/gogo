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
      <div className="register-page">
        <header className="register-top">
          <a className="iconbtn" href="/login" aria-label="返回登录">
            <Icon name="left" />
          </a>
          <div className="register-top-title">创建 GoGo 账号</div>
        </header>

        <div className="register-body">
          <div className="register-brand">
            <div className="register-logo"><Icon name="branch" /></div>
            <div>
              <div className="register-brand-name">GoGo</div>
              <div className="register-brand-sub">一起出发，各有所爱</div>
            </div>
          </div>

          <form onSubmit={submit} noValidate>
            <div className="field">
              <label className="label" htmlFor="register-name">名字</label>
              <input
                id="register-name"
                className={`input${errors.name ? ' invalid' : ''}`}
                type="text"
                autoComplete="nickname"
                value={name}
                maxLength={NAME_MAX}
                onChange={(event) => {
                  setName(event.target.value)
                  setErrors((current) => ({ ...current, name: undefined }))
                }}
                required
              />
              {errors.name && <p className="error">{errors.name}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="register-email">邮箱</label>
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
              {errors.email && <p className="error">{errors.email}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="register-password">密码</label>
              <input
                id="register-password"
                className={`input${errors.password ? ' invalid' : ''}`}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setErrors((current) => ({ ...current, password: undefined, confirm: undefined }))
                }}
                required
              />
              <p className="help">至少 8 个字符</p>
              {errors.password && <p className="error">{errors.password}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="register-confirm">确认密码</label>
              <input
                id="register-confirm"
                className={`input${errors.confirm ? ' invalid' : ''}`}
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => {
                  setConfirm(event.target.value)
                  setErrors((current) => ({ ...current, confirm: undefined }))
                }}
                required
              />
              {errors.confirm && <p className="error">{errors.confirm}</p>}
            </div>

            {formError && <p role="alert" className="error">{formError}</p>}
            <button className="btn btn-primary register-submit" type="submit" disabled={busy}>
              <Icon name="user" className="sm" />
              {busy ? '正在注册…' : '创建账号'}
            </button>
          </form>

          <a className="btn btn-ghost register-login" href="/login">已有账号？去登录</a>
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
