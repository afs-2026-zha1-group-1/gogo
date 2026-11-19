import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Icon from '../../Icons'
import { api } from '../../api'
import { fetchUserInterests } from '../../api/preferences'
import { useAuth } from './AuthProvider'
import { isCurrentTripResponse } from '../../lib/current-trip'
import { tripPhoto } from '../../lib/trip-photo'
import type { TripListItem, TripListResponse } from '../../types'

const NAME_MIN = 1
const NAME_MAX = 30

function nameLength(value: string): number {
  return Array.from(value).length
}

/** `2026-12-05` -> `2026.12.05` (display only; the stored value stays ISO). */
function displayDate(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.replaceAll('-', '.') : iso
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export default function AccountPage() {
  const { account, updateName, logout } = useAuth()
  const [name, setName] = useState(account?.name ?? '')
  const [editing, setEditing] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  const displayName = account?.name ?? '账号'
  const initial = Array.from(displayName.trim())[0]?.toUpperCase() ?? '?'

  // The three reads below only feed the summary blocks. When one fails the block
  // stays empty instead of showing an invented number (same rule as the dashboard).
  const tripsQuery = useQuery({
    queryKey: ['account-trips', account?.id ?? null],
    queryFn: async (): Promise<TripListItem[]> => {
      const result = await api<TripListResponse>('/api/trips')
      return result.ok ? result.data?.trips ?? [] : []
    },
    enabled: Boolean(account),
  })

  const currentQuery = useQuery({
    queryKey: ['account-current-trip', account?.id ?? null],
    queryFn: async (): Promise<number | null> => {
      const result = await api<unknown>('/api/trips/current')
      return result.ok && isCurrentTripResponse(result.data) ? result.data.tripId : null
    },
    enabled: Boolean(account),
  })

  const interestsQuery = useQuery({
    queryKey: ['user-interests', account?.id ?? null],
    queryFn: fetchUserInterests,
    enabled: Boolean(account),
  })

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
      setEditing(false)
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

  function cancelEdit() {
    setEditing(false)
    setName(account?.name ?? '')
    setSaveError('')
    setSaved(false)
  }

  const trips = tripsQuery.data ?? []
  const loaded = tripsQuery.isSuccess
  const organised = trips.some((trip) => trip.organizer)
  const confirmed = trips.filter((trip) => trip.mainPlanConfirmed).length
  const currentTrip =
    currentQuery.data == null ? undefined : trips.find((trip) => trip.id === currentQuery.data)
  const interests = interestsQuery.data?.interests ?? []

  return (
    <div className="screen account-page">
      <header className="account-top">
        <div className="account-top-title">我的</div>
        <span className="account-caption">YOUR CORNER OF GOGO</span>
      </header>

      <div className="account-body">
        <div className="account-cover" aria-hidden="true">
          <span>THE GOOD DAYS CLUB</span>
          <strong>生活很忙，<br />也要一起去看看。</strong>
          <small>GOOD FRIENDS · GOOD JOURNEYS</small>
        </div>

        <section className="account-profile" aria-label="账号信息">
          <div className="account-avatar" aria-hidden="true">{initial}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="account-name-row">
              {editing ? (
                <form className="account-name-editor" onSubmit={save}>
                  <input
                    id="account-name"
                    className={`account-name-input${saveError ? ' invalid' : ''}`}
                    value={name}
                    maxLength={NAME_MAX}
                    autoComplete="nickname"
                    aria-label="名字"
                    autoFocus
                    onChange={(event) => {
                      setName(event.target.value)
                      setSaved(false)
                      setSaveError('')
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') cancelEdit()
                    }}
                  />
                  <button
                    className="iconbtn account-name-action"
                    type="submit"
                    aria-label="保存名字"
                    disabled={saving}
                  >
                    <Icon name={saving ? 'clock' : 'check'} className="sm" />
                  </button>
                  <button
                    className="iconbtn"
                    type="button"
                    aria-label="取消编辑名字"
                    disabled={saving}
                    onClick={cancelEdit}
                  >
                    <Icon name="x" className="sm" />
                  </button>
                </form>
              ) : (
                <>
                  <div className="account-name">{displayName}</div>
                  <button
                    className="iconbtn account-edit"
                    type="button"
                    aria-label="编辑名字"
                    onClick={() => {
                      setName(account?.name ?? '')
                      setSaveError('')
                      setSaved(false)
                      setEditing(true)
                    }}
                  >
                    <Icon name="edit" className="sm" />
                  </button>
                </>
              )}
            </div>
            <div className="account-handle">GoGo 旅行伙伴</div>
            <div className="account-email">{account?.email ?? ''}</div>
            {saveError && <p role="alert" className="error account-name-error">{saveError}</p>}
            {saved && !editing && <p role="status" className="hint account-name-status">已保存。</p>}
          </div>
          {organised && <span className="account-badge">旅程组织者</span>}
        </section>

        <div className="account-stats">
          <div>
            <strong>{loaded ? pad2(trips.length) : '—'}</strong>
            <small>我的旅程</small>
          </div>
          <i aria-hidden="true" />
          <div>
            <strong>{loaded ? pad2(confirmed) : '—'}</strong>
            <small>已定好计划</small>
          </div>
          <i aria-hidden="true" />
          <div>
            <strong>∞</strong>
            <small>期待的风景</small>
          </div>
        </div>

        <div className="account-section-head">
          <div>
            <span>JOURNEY COLLECTION</span>
            <h2>我的行程</h2>
          </div>
          <a href="#/my-trips">
            管理全部 <Icon name="arrow" className="sm" />
          </a>
        </div>

        {currentTrip ? (
          <a className="account-current" href={`#/trips/${currentTrip.id}`}>
            <span
              className="account-current-photo"
              aria-hidden="true"
              style={{ ['--thumb-photo' as string]: tripPhoto(currentTrip.destination, currentTrip.id) }}
            />
            <span className="account-current-text">
              <small>正在关注 · {currentTrip.mainPlanConfirmed ? '主线已确认' : '主线待确认'}</small>
              <strong>{currentTrip.name}</strong>
              <em>{currentTrip.destination} · {displayDate(currentTrip.startDate)}</em>
            </span>
            <Icon name="right" className="sm" />
          </a>
        ) : (
          <a className="account-current account-current-empty" href="#/my-trips">
            <span className="account-current-photo" aria-hidden="true" />
            <span className="account-current-text">
              <small>还没有选定的行程</small>
              <strong>挑一趟旅程，接着一起计划</strong>
              <em>{loaded && trips.length > 0 ? `已有 ${trips.length} 趟可以选` : '创建或加入一趟旅程'}</em>
            </span>
            <Icon name="right" className="sm" />
          </a>
        )}

        <div className="account-section-head account-head-spaced">
          <div>
            <span>MY TRAVEL TASTE</span>
            <h2>我的旅行偏好</h2>
          </div>
        </div>

        <a className="account-prefs" href="#/my-preferences">
          <span className="account-prefs-symbol" aria-hidden="true">✳</span>
          <span className="account-prefs-text">
            <strong>把喜欢的，都告诉 GoGo</strong>
            <small>
              {interests.length > 0
                ? `${interests.join('、')}。下次规划更懂你。`
                : '还没选兴趣，挑几个下次规划更懂你。'}
            </small>
          </span>
          <Icon name="arrow" className="sm" />
        </a>

        {logoutError && <p role="alert" className="error">{logoutError}</p>}
        <button className="account-logout" type="button" onClick={signOut} disabled={loggingOut}>
          {loggingOut ? '正在退出…' : '退出登录'}
          <Icon name="arrow" className="sm" />
        </button>
        <p className="account-motto">KEEP THE GOOD DAYS COMING. ✳</p>
      </div>
    </div>
  )
}
