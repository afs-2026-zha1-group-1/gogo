import { useEffect, useState } from 'react'
import Icon from '../../Icons'
import { useAuth } from './AuthProvider'

const NAME_MIN = 1
const NAME_MAX = 30

function nameLength(value: string): number {
  return Array.from(value).length
}

export default function AccountPage() {
  const { account, updateName, logout } = useAuth()
  const [name, setName] = useState(account?.name ?? '')
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  const displayName = account?.name ?? '账号'
  const initial = Array.from(displayName.trim())[0]?.toUpperCase() ?? '?'

  useEffect(() => {
    setName(account?.name ?? '')
  }, [account?.name])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaveError('')
    setSaved(false)
    const trimmed = name.trim()
    const length = nameLength(trimmed)
    if (length < NAME_MIN || length > NAME_MAX) {
      setSaveError('名字需要 1–30 个字符。')
      return
    }
    setSaving(true)
    try {
      const result = await updateName(trimmed)
      if (!result.ok) {
        setSaveError(result.data?.code === 'INVALID_NAME'
          ? '名字需要 1–30 个字符。'
          : '保存失败，请稍后重试。')
        return
      }
      setSaved(true)
    } catch {
      setSaveError('无法连接服务器，请稍后重试。')
    } finally {
      setSaving(false)
    }
  }

  async function signOut() {
    setLogoutError('')
    setLoggingOut(true)
    try {
      const result = await logout()
      if (!result.ok) {
        setLogoutError('退出失败，请稍后重试。')
        return
      }
      window.location.assign('/login')
    } catch {
      setLogoutError('无法连接服务器，请稍后重试。')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="screen account-page">
      <header className="account-top">
        <a className="iconbtn" href="#/" aria-label="返回仪表盘">
          <Icon name="left" />
        </a>
        <div className="account-top-title">我的</div>
      </header>

      <div className="account-body">
        <div className="account-profile">
          <div className="account-avatar" aria-hidden="true">{initial}</div>
          <div>
            <div className="account-name">{displayName}</div>
            <div className="account-email">{account?.email ?? ''}</div>
          </div>
        </div>

        <a className="qcard" href="#/my-trips">
          <span className="qi"><Icon name="list" /></span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span className="qt" style={{ display: 'block' }}>我的行程</span>
            <span className="qd" style={{ display: 'block' }}>选择当前行程，在「行程」页查看</span>
          </span>
          <Icon name="arrow" className="sm" />
        </a>

        <a className="qcard" href="#/my-preferences">
          <span className="qi"><Icon name="star" /></span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span className="qt" style={{ display: 'block' }}>偏好设置</span>
            <span className="qd" style={{ display: 'block' }}>设置我的默认兴趣，之后的行程自动勾选</span>
          </span>
          <Icon name="arrow" className="sm" />
        </a>

        <form onSubmit={save}>
          <label className="label" htmlFor="account-name">名字</label>
          <input
            id="account-name"
            className={`input${saveError ? ' invalid' : ''}`}
            value={name}
            maxLength={NAME_MAX}
            autoComplete="nickname"
            onChange={(event) => {
              setName(event.target.value)
              setSaved(false)
              setSaveError('')
            }}
          />
          {saveError && <p role="alert" className="error">{saveError}</p>}
          {saved && <p role="status" className="hint">已保存。</p>}
          <button className="btn btn-primary account-save" type="submit" disabled={saving}>
            <Icon name="check" className="sm" />
            {saving ? '正在保存…' : '保存名字'}
          </button>
        </form>

        {logoutError && <p role="alert" className="error">{logoutError}</p>}
        <button className="btn account-logout" type="button" onClick={signOut} disabled={loggingOut}>
          <Icon name="left" className="sm" />
          {loggingOut ? '正在退出…' : '退出登录'}
        </button>
      </div>
    </div>
  )
}
