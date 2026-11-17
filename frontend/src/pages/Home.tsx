import { useEffect, useState } from 'react'
import { api } from '../api'
import Icon from '../Icons'
import { useAuth } from '../features/auth/AuthProvider'
import { dashboardDateString } from './dashboardDate'
import DashboardTrip from './DashboardTrip'

interface TripCard {
  id: number
  name: string
  destination: string
  startDate: string
  endDate: string
}

type ListState =
  | { kind: 'loading' }
  | { kind: 'ready'; trips: TripCard[] }
  | { kind: 'error'; message: string }

function isTripCard(value: unknown): value is TripCard {
  if (typeof value !== 'object' || value === null) return false
  const card = value as Record<string, unknown>
  return typeof card.id === 'number' && Number.isSafeInteger(card.id) && card.id > 0
    && typeof card.name === 'string' && card.name.trim().length > 0
    && typeof card.destination === 'string' && card.destination.trim().length > 0
    && dashboardDateString(card.startDate) && dashboardDateString(card.endDate)
    && card.startDate <= card.endDate
}

export default function Home({ tripId, onTripReady }: {
  tripId?: number | null
  onTripReady?: (tripId: number) => void
}) {
  const { account } = useAuth()
  const [state, setState] = useState<ListState>({ kind: 'loading' })

  useEffect(() => {
    if (tripId !== undefined) return
    let active = true
    setState({ kind: 'loading' })
    api<unknown>('/api/trips')
      .then((result) => {
        if (!result.ok) throw new Error(`HTTP ${result.status}`)
        if (!Array.isArray(result.data) || !result.data.every(isTripCard)) {
          throw new Error('行程列表数据无效')
        }
        if (active) setState({ kind: 'ready', trips: result.data })
      })
      .catch((cause: unknown) => {
        if (active) setState({
          kind: 'error',
          message: cause instanceof Error ? cause.message : '未知错误',
        })
      })
    return () => { active = false }
  }, [tripId])

  return (
    <div className="screen">
      <header className="appbar">
        <div className="logo"><Icon name="branch" /></div>
        <div className="grow">
          <div className="title">我的行程</div>
          <div className="sub">你好，{account?.name ?? '旅行者'}</div>
        </div>
        <a className="iconbtn" href="#/scan" aria-label="扫码加入行程"><Icon name="scan" /></a>
      </header>
      <div className="body">
        {tripId !== undefined ? (
          <DashboardTrip tripId={tripId} onTripReady={onTripReady} />
        ) : (
          <>
            <div className="sec-title"><Icon name="list" className="sm" /> 我的行程</div>
            {state.kind === 'loading' && <p className="loading">正在加载行程…</p>}
            {state.kind === 'error' && <p role="alert" className="error">无法加载行程：{state.message}</p>}
            {state.kind === 'ready' && state.trips.length === 0 && (
              <section className="card pad empty-state">
                <h2>暂无行程</h2>
                <p className="hint">创建行程或通过邀请加入。</p>
              </section>
            )}
            {state.kind === 'ready' && state.trips.map((trip) => (
              <a className="card pad dashboard-trip-card" key={trip.id} href={`#/dashboard/trips/${trip.id}`}>
                <h2>{trip.name}</h2>
                <p>{trip.destination}</p>
                <p>{trip.startDate} – {trip.endDate}</p>
              </a>
            ))}
            <a className="btn btn-primary" href="#/create">
              <Icon name="plus" className="sm" /> 创建行程
            </a>
          </>
        )}
      </div>
    </div>
  )
}
