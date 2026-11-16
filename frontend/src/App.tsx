import { useEffect, useState } from 'react'
import { users } from './api'
import type { InAppPage, Route, TabId } from './types'
import TabBar from './TabBar'
import Home from './pages/Home.jsx'
import CreateTrip from './pages/CreateTrip'
import TripDetails from './pages/TripDetails.jsx'
import TripsEmpty from './pages/TripsEmpty'
import Placeholder from './pages/Placeholder'
import Join from './pages/Join.jsx'
import MainPlan from './pages/MainPlan'
import MainPlanInputs from './pages/MainPlanInputs'
import Scanner from './pages/Scanner'

function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/'
  // Scanner owns its top-level hash and must be matched before the
  // generic `/trips/<id>` regex (design D1); `from` is filled in by the
  // App state tracker below, so parseRoute only signals the shape here.
  if (path === '/scan') return { page: 'scan', from: null }
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
  // Tracks the last non-scanner hash so closing the scanner can restore
  // the originating route (spec S-5 / design D2). Falls back to `#/` via
  // the Scanner close handler when this is null (user typed `#/scan`).
  const [lastNonScanHash, setLastNonScanHash] = useState<string | null>(() => {
    const initial = window.location.hash
    return initial && initial.replace(/^#/, '') !== '/scan' ? initial : null
  })
  const user = users().find((candidate) => candidate.id === userId)

  useEffect(() => {
    const onHash = () => {
      const next = window.location.hash
      const parsed = parseRoute(next)
      if (parsed.page === 'scan') {
        setRoute({ ...parsed, from: lastNonScanHash })
      } else {
        setLastNonScanHash(next || '#/')
        setRoute(parsed)
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [lastNonScanHash])

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

  // Scanner is a full-screen flow outside the shell + TabBar (design D1, C2).
  // Task 4.1 fills the UI surface and task 4.2 registers the #/scan hash
  // route in parseRoute. Scaffolding this branch here keeps InAppPage and
  // TAB_FOR_PAGE in sync so the union narrowing at line 117 stays sound.
  if (route.page === 'scan') {
    return (
      <div className="app">
        <ScaffoldBar userId={userId} onChange={setUserId} />
        <Scanner from={route.from} />
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