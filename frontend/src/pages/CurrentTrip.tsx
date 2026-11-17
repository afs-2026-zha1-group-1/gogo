import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api'
import Icon from '../Icons'
import TripDetails from './TripDetails'
import { isCurrentTripResponse } from '../lib/current-trip'

type CurrentState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'ready'; tripId: number }
  | { kind: 'failed'; message: string }

/** `#/trips`: the account's current trip details, or guidance to pick one. */
export default function CurrentTrip() {
  const [state, setState] = useState<CurrentState>({ kind: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setState({ kind: 'loading' })
    api<unknown>('/api/trips/current')
      .then((result) => {
        if (!active) return
        if (result.ok && isCurrentTripResponse(result.data)) {
          setState(result.data.tripId == null
            ? { kind: 'empty' }
            : { kind: 'ready', tripId: result.data.tripId })
          return
        }
        const message = result.ok
          ? '无法读取当前行程'
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

  if (state.kind === 'ready') {
    return <TripDetails tripId={state.tripId} />
  }

  const appbar = (
    <header className="appbar">
      <div className="logo"><Icon name="list" /></div>
      <div className="grow">
        <div className="title">行程</div>
        <div className="sub">当前行程</div>
      </div>
    </header>
  )

  if (state.kind === 'loading') {
    return (
      <div className="screen">
        {appbar}
        <div className="body"><div className="loading">正在加载当前行程…</div></div>
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
            <p>当前行程加载失败</p>
            <p className="hint" role="alert">{state.message}</p>
            <button className="btn btn-ghost" type="button" style={{ marginTop: 12 }} onClick={() => setReloadKey((key) => key + 1)}>
              重试
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      {appbar}
      <div className="body">
        <div className="empty">
          <Icon name="list" />
          <p>还没有当前行程</p>
          <p className="hint">在「我的行程」里选择一个行程，这里就会展示它的详情</p>
        </div>
        <a className="btn btn-primary" href="#/my-trips">
          <Icon name="list" className="sm" />
          去我的行程选择
        </a>
      </div>
    </div>
  )
}
