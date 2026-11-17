import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api'
import Icon from '../Icons'
import type { TripListItem, TripListResponse } from '../types'

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

export default function TripsList() {
  const [state, setState] = useState<ListState>({ kind: 'loading' })
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

  const appbar = (
    <header className="appbar">
      <div className="logo"><Icon name="list" /></div>
      <div className="grow">
        <div className="title">行程</div>
        <div className="sub">我创建和加入的行程</div>
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
          <section className="card pad empty-state">
            <h2>行程加载失败</h2>
            <p className="hint" role="alert">{state.message}</p>
            <button className="btn btn-primary" type="button" onClick={() => setReloadKey((key) => key + 1)}>
              重试
            </button>
          </section>
        </div>
      </div>
    )
  }

  if (state.trips.length === 0) {
    return (
      <div className="screen">
        {appbar}
        <div className="body">
          <section className="card pad empty-state">
            <h2>还没有行程</h2>
            <p className="hint">创建一个新行程，或通过邀请链接加入朋友的行程。</p>
            <a className="btn btn-primary" href="#/create">
              <Icon name="plus" className="sm" />
              创建行程
            </a>
          </section>
        </div>
      </div>
    )
  }

  const today = todayIso()
  return (
    <div className="screen">
      {appbar}
      <div className="body">
        {state.trips.map((trip) => (
          <a key={trip.id} className="card pad" href={`#/trips/${trip.id}`} style={{ display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700 }}>{trip.name}</span>
              {trip.organizer && <span className="pill brand">我创建的</span>}
              {isEnded(trip.endDate, today) && <span className="pill warn">已结束</span>}
            </div>
            <div className="hint" style={{ marginTop: 4 }}>
              {trip.destination} · {trip.startDate} – {trip.endDate}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
