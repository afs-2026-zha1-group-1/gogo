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
          <Placeholder title="分队" tripsHref={tripsHref} />
        )}
        {route.page === 'members' && (
          <Placeholder title="成员" tripsHref={tripsHref} />
        )}
      </div>
      <TabBar active={TAB_FOR_PAGE[route.page]} tripsHref={tripsHref} />
    </div>
  )
}
