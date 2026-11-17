import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api'
import Icon from '../Icons'
import { useAuth } from '../features/auth/AuthProvider'
import { isCurrentTripResponse } from '../lib/current-trip'
import DashboardTrip from './DashboardTrip'

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
        ) : selectionInFlight || state.kind === 'loading' ? (
          <p className="loading">正在加载当前行程…</p>
        ) : state.kind === 'error' ? (
          <section className="card pad">
            <p role="alert" className="error">无法加载当前行程：{state.message}</p>
            <button className="btn btn-ghost" type="button" onClick={() => setReloadKey((key) => key + 1)}>重试</button>
          </section>
        ) : state.tripId === null ? (
          <section className="card pad empty-state">
            <h2>尚未选择行程</h2>
            <p className="hint">在「我的行程」里选择一个行程，或创建新行程。</p>
            <a className="btn btn-primary" href="#/my-trips">去我的行程选择</a>
            <a className="btn btn-ghost" href="#/create">创建行程</a>
          </section>
        ) : (
          <DashboardTrip tripId={state.tripId} onTripReady={onTripReady} />
        )}
      </div>
    </div>
  )
}
