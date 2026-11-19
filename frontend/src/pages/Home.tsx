import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api'
import Icon from '../Icons'
import { useAuth } from '../features/auth/AuthProvider'
import { isCurrentTripResponse } from '../lib/current-trip'
import DashboardTrip from './DashboardTrip'
import DashboardNoTrip from './DashboardNoTrip'
import type { TripListResponse } from '../types'

type CurrentState =
  | { kind: 'loading' }
  | { kind: 'ready'; tripId: number | null }
  | { kind: 'error'; message: string }

export default function Home({ tripId, onTripReady, selectionInFlight = false }: {
  tripId?: number | null
  onTripReady?: (tripId: number) => void
  selectionInFlight?: boolean
}) {
  const { account } = useAuth()
  const [state, setState] = useState<CurrentState>({ kind: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  // 右上角行程数量：来自真实行程列表，取不到时不显示数字。
  const [tripCount, setTripCount] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    api<TripListResponse>('/api/trips')
      .then((result) => {
        if (!active || !result.ok) return
        const trips = result.data?.trips
        if (Array.isArray(trips)) setTripCount(trips.length)
      })
      .catch(() => {
        /* 数量只是装饰，失败时静默 */
      })
    return () => { active = false }
  }, [account?.id])

  useEffect(() => {
    if (tripId !== undefined || selectionInFlight) return
    let active = true
    setState({ kind: 'loading' })
    api<unknown>('/api/trips/current')
      .then((result) => {
        if (!active) return
        if (result.ok && isCurrentTripResponse(result.data)) {
          setState({ kind: 'ready', tripId: result.data.tripId })
        } else {
          setState({
            kind: 'error',
            message: result.ok ? '当前行程数据无效' : result.data?.message ?? `请求失败（HTTP ${result.status}）`,
          })
        }
      })
      .catch((cause: unknown) => {
        if (active) setState({ kind: 'error', message: `无法连接服务器：${errorMessage(cause)}` })
      })
    return () => { active = false }
  }, [tripId, account?.id, reloadKey, selectionInFlight])

  return (
    <div className="screen">
      <header className="appbar dash-appbar">
        <div className="dash-brand">
          <span className="dash-wordmark">gogo.</span>
          <span className="dash-tagline">GOOD DAYS TOGETHER</span>
        </div>
        <a className="dash-scan" href="#/scan" aria-label="扫码加入行程">
          <Icon name="scan" className="sm" />
          一起去玩
        </a>
      </header>
      <div className="body">
        <section className="dash-greeting">
          <div className="dash-greeting-main">
            <div className="dash-greeting-line">
              <span className="dash-hello">嗨，{account?.name ?? '旅行者'}</span>
              <span className="dash-kicker">✳ GOOD DAYS AHEAD</span>
            </div>
            <h1 className="dash-title">
              走吧，<em>一起去玩</em>
            </h1>
            <p className="dash-subtitle">把期待，变成一次真的相聚。</p>
          </div>
          <a className="dash-trip-card" href="#/my-trips" aria-label="我的行程">
            <span className="dash-trip-icon"><Icon name="branch" className="sm" /></span>
            <span className="dash-trip-count">
              {tripCount == null ? '—' : String(tripCount).padStart(2, '0')}
            </span>
            <span className="dash-trip-label">
              我的行程
              <Icon name="right" className="sm" />
            </span>
          </a>
        </section>
        <div className="dash-upcoming">UPCOMING JOURNEY</div>
        {tripId !== undefined ? (
          <DashboardTrip tripId={tripId} onTripReady={onTripReady} />
        ) : selectionInFlight || state.kind === 'loading' ? (
          <p className="loading">正在加载当前行程…</p>
        ) : state.kind === 'error' ? (
          <section className="card pad">
            <p role="alert" className="error">无法加载当前行程：{state.message}</p>
            <button className="btn btn-ghost" type="button" onClick={() => setReloadKey((key) => key + 1)}>重试</button>
          </section>
        ) : state.tripId === null ? (
          <DashboardNoTrip />
        ) : (
          <DashboardTrip tripId={state.tripId} onTripReady={onTripReady} />
        )}
      </div>
    </div>
  )
}
