import { useEffect, useState } from 'react'
import { users } from './api'
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

function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/'
  const joinMatch = path.match(/^\/join\/([^/]+)$/)
  if (joinMatch) return { page: 'join', token: decodeURIComponent(joinMatch[1]) }
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

function ScaffoldBar({ userId, onChange }: { userId: number; onChange: (id: number) => void }) {
  return (
    <div className="scaffold-bar">
      <span className="scaffold-label">IDENTITY · SCAFFOLD（非登录）</span>
      <select
        aria-label="Demo identity"
        value={userId}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {users().map((candidate) => (
          <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
        ))}
      </select>
    </div>
  )
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash))
  const [userId, setUserId] = useState<number>(1)
  const [lastTripId, setLastTripId] = useState<number | null>(null)
  const user = users().find((candidate) => candidate.id === userId)

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (route.page === 'details') setLastTripId(route.tripId)
  }, [route])

  const tripsHref = lastTripId != null ? `#/trips/${lastTripId}` : '#/trips'

  if (route.page === 'join') {
    return (
      <div className="app">
        <ScaffoldBar userId={userId} onChange={setUserId} />
        <Join token={route.token} userId={userId} userName={user?.name} />
      </div>
    )
  }

  if (route.page === 'main-plan') {
    return (
      <div className="app">
        <ScaffoldBar userId={userId} onChange={setUserId} />
        <MainPlan userId={userId} tripId={route.tripId} />
      </div>
    )
  }

  if (route.page === 'main-plan-inputs') {
    return (
      <div className="app">
        <ScaffoldBar userId={userId} onChange={setUserId} />
        <MainPlanInputs userId={userId} tripId={route.tripId} />
      </div>
    )
  }

  return (
    <div className="app">
      <ScaffoldBar userId={userId} onChange={setUserId} />
      <div className="shell-content">
        {route.page === 'home' && <Home />}
        {route.page === 'create' && <CreateTrip userId={userId} backHref={tripsHref} />}
        {route.page === 'details' && <TripDetails userId={userId} tripId={route.tripId} />}
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
                    onClick={() => {
                      try {
                        localStorage.setItem('gogo.split.memberId', String(userId))
                      } catch {
                        /* storage unavailable */
                      }
                      window.location.href = `/trips/${lastTripId}/split`
                    }}
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
