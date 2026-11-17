import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api'
import Icon from '../Icons'
import type { CurrentTripResponse, TripListItem, TripListResponse } from '../types'

/** Local-date comparison: both sides are `YYYY-MM-DD`, so lexical order is date order. */
export function isEnded(endDate: string, today: string): boolean {
  return endDate < today
}

export function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

type ListState =
  | { kind: 'loading' }
  | { kind: 'ready'; trips: TripListItem[] }
  | { kind: 'failed'; message: string }

interface TripsListProps {
  title?: string
  subtitle?: string
  /** Picker mode: tapping a row stores it as the current trip and tags the card; no navigation. */
  selectable?: boolean
}

export default function TripsList({
  title = '我的行程',
  subtitle,
  selectable = false,
}: TripsListProps) {
  const [state, setState] = useState<ListState>({ kind: 'loading' })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectError, setSelectError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setState({ kind: 'loading' })
    api<TripListResponse>('/api/trips')
      .then((result) => {
        if (!active) return
        if (result.ok && result.data) {
          setState({ kind: 'ready', trips: result.data.trips })
          return
        }
        const message = result.ok
          ? '无法读取行程列表'
          : result.data?.message ?? `请求失败（HTTP ${result.status}）`
        setState({ kind: 'failed', message })
      })
      .catch((cause: unknown) => {
        if (active) setState({ kind: 'failed', message: `无法连接服务器：${errorMessage(cause)}` })
      })
    return () => {
      active = false
    }
  }, [reloadKey])

  useEffect(() => {
    if (!selectable) return
    let active = true
    api<CurrentTripResponse>('/api/trips/current')
      .then((result) => {
        if (active && result.ok && result.data) setSelectedId(result.data.tripId)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [selectable, reloadKey])

  async function pick(trip: TripListItem) {
    setSelectError('')
    const result = await api<CurrentTripResponse>('/api/trips/current', {
      method: 'PUT',
      body: { tripId: trip.id },
    })
    if (result.ok && result.data?.tripId != null) {
      setSelectedId(result.data.tripId)
      return
    }
    setSelectError(result.ok ? '设置当前行程失败' : result.data?.message ?? `请求失败（HTTP ${result.status}）`)
  }

  const count = state.kind === 'ready' ? state.trips.length : 0
  const appbar = (
    <header className="appbar">
      <div className="logo"><Icon name="list" /></div>
      <div className="grow">
        <div className="title">{title}</div>
        <div className="sub">{subtitle ?? (state.kind === 'ready' ? (count ? `${count} 个行程` : '还没有行程') : '我创建和加入的行程')}</div>
      </div>
    </header>
  )

  if (state.kind === 'loading') {
    return (
      <div className="screen">
        {appbar}
        <div className="body"><div className="loading">正在加载行程…</div></div>
      </div>
    )
  }

  if (state.kind === 'failed') {
    return (
      <div className="screen">
        {appbar}
        <div className="body">
          <div className="empty">
            <Icon name="alert" />
            <p>行程加载失败</p>
            <p className="hint" role="alert">{state.message}</p>
            <button className="btn btn-ghost" type="button" style={{ marginTop: 12 }} onClick={() => setReloadKey((key) => key + 1)}>
              重试
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (state.trips.length === 0) {
    return (
      <div className="screen">
        {appbar}
        <div className="body">
          <div className="empty">
            <Icon name="list" />
            <p>还没有行程</p>
            <p className="hint">创建行程或接受朋友的邀请</p>
          </div>
          <a className="btn btn-ghost" href="#/create">
            <Icon name="plus" className="sm" />
            创建行程
          </a>
        </div>
      </div>
    )
  }

  const today = todayIso()
  return (
    <div className="screen">
      {appbar}
      <div className="body">
        {selectError && <p role="alert" className="error" style={{ marginBottom: 10 }}>{selectError}</p>}
        {state.trips.map((trip) => {
          const selected = selectable && selectedId === trip.id
          const body = (
            <>
              <span className="qi"><Icon name="pin" /></span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span className="qt" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', overflowWrap: 'anywhere' }}>
                  {trip.name}
                  {trip.organizer && <span className="pill brand">我创建的</span>}
                  {isEnded(trip.endDate, today) && <span className="pill warn">已结束</span>}
                </span>
                <span className="qd" style={{ display: 'block', overflowWrap: 'anywhere' }}>
                  {trip.destination} · {trip.startDate} – {trip.endDate}
                </span>
              </span>
              {selected && <span className="pill ok qtag">已选择</span>}
            </>
          )
          return selectable ? (
            <button
              key={trip.id}
              type="button"
              className={`qcard${selected ? ' selected' : ''}`}
              aria-pressed={selected}
              onClick={() => pick(trip)}
            >
              {body}
            </button>
          ) : (
            <a key={trip.id} className="qcard" href={`#/trips/${trip.id}`}>
              {body}
            </a>
          )
        })}
        <a className="btn btn-ghost" style={{ marginTop: 16 }} href="#/create">
          <Icon name="plus" className="sm" />
          创建行程
        </a>
      </div>
    </div>
  )
}
