import { useEffect, useState } from 'react'
import type { InAppPage, Route, TabId } from './types'
import TabBar from './TabBar'
import Home from './pages/Home'
import CreateTrip from './pages/CreateTrip'
import TripDetails from './pages/TripDetails'
import TripsEmpty from './pages/TripsEmpty'
import Placeholder from './pages/Placeholder'
import Join from './pages/Join'
import MainPlan from './pages/MainPlan'
import MainPlanInputs from './pages/MainPlanInputs'
import LoginPage from './features/auth/LoginPage'
import { useAuth } from './features/auth/AuthProvider'

function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/'
  const joinMatch = path.match(/^\/join\/([^/]+)$/)
  if (joinMatch) return { page: 'join', token: decodeURIComponent(joinMatch[1]) }
  if (path === '/login') return { page: 'login' }
  const mainPlanInputsMatch = path.match(/^\/trips\/(\d+)\/main-plan\/inputs$/)
  if (mainPlanInputsMatch) return { page: 'main-plan-inputs', tripId: Number(mainPlanInputsMatch[1]) }
  const mainPlanMatch = path.match(/^\/trips\/(\d+)\/main-plan$/)
  if (mainPlanMatch) return { page: 'main-plan', tripId: Number(mainPlanMatch[1]) }
  const tripMatch = path.match(/^\/trips\/(\d+)$/)
  if (tripMatch) return { page: 'details', tripId: Number(tripMatch[1]) }
  if (path === '/trips') return { page: 'trips-empty' }
  if (path === '/create') return { page: 'create' }
  if (path === '/split') return { page: 'split' }
  if (path === '/members') return { page: 'members' }
  return { page: 'home' }
}

const TAB_FOR_PAGE: Record<InAppPage, TabId> = {
  home: 'dashboard',
  'trips-empty': 'trips',
  details: 'trips',
  create: 'trips',
  split: 'split',
  members: 'members',
}

function AccountBar({ name }: { name: string }) {
  return (
    <div className="scaffold-bar">
      <span className="scaffold-label">已登录 · {name}</span>
    </div>
  )
}

export default function App() {
  const { status, account } = useAuth()
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash))
  const [lastTripId, setLastTripId] = useState<number | null>(null)

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (route.page === 'details') setLastTripId(route.tripId)
  }, [route])

  const tripsHref = lastTripId != null ? `#/trips/${lastTripId}` : '#/trips'

  if (route.page === 'login') return <LoginPage />

  if (route.page === 'join') {
    return (
      <div className="app">
        <Join token={route.token} />
      </div>
    )
  }

  if (status === 'checking') {
    return (
      <div className="app">
        <div className="shell-content"><div className="loading">正在验证登录…</div></div>
      </div>
    )
  }

  if (status !== 'signedIn' || !account) {
    return <LoginPage />
  }

  if (route.page === 'main-plan') {
    return (
      <div className="app">
        <AccountBar name={account.name} />
        <MainPlan tripId={route.tripId} />
      </div>
    )
  }

  if (route.page === 'main-plan-inputs') {
    return (
      <div className="app">
        <AccountBar name={account.name} />
        <MainPlanInputs tripId={route.tripId} />
      </div>
    )
  }

  return (
    <div className="app">
      <AccountBar name={account.name} />
      <div className="shell-content">
        {route.page === 'home' && <Home />}
        {route.page === 'create' && <CreateTrip backHref={tripsHref} />}
        {route.page === 'details' && <TripDetails tripId={route.tripId} />}
        {route.page === 'trips-empty' && <TripsEmpty />}
        {route.page === 'split' && (
          <div className="screen">
            <header className="appbar">
              <div className="grow">
                <div className="title">分队规划</div>
                <div className="sub">A/B 分头游玩 · 到点会合</div>
              </div>
            </header>
            <div className="body">
              {lastTripId != null ? (
                <section className="card pad">
                  <p className="hint" style={{ marginBottom: 12 }}>
                    进入当前行程（#{lastTripId}）的分队：发起草稿、选择边界、生成路线、校验会合窗口。
                  </p>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => { window.location.href = `/trips/${lastTripId}/split` }}
                  >
                    进入分队规划
                  </button>
                </section>
              ) : (
                <section className="card pad">
                  <p className="hint" style={{ marginBottom: 12 }}>
                    请先在「行程」页打开一个行程，再从行程详情或底部「分队」进入分队规划。
                  </p>
                  <a className="btn btn-ghost" href={tripsHref}>去行程</a>
                </section>
              )}
            </div>
          </div>
        )}
        {route.page === 'members' && (
          <Placeholder title="成员" tripsHref={tripsHref} />
        )}
      </div>
      <TabBar active={TAB_FOR_PAGE[route.page]} tripsHref={tripsHref} />
    </div>
  )
}
