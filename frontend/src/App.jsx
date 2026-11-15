import { useEffect, useState } from 'react'
import { users } from './api.js'
import TabBar from './TabBar.jsx'
import Home from './pages/Home.jsx'
import CreateTrip from './pages/CreateTrip.jsx'
import TripDetails from './pages/TripDetails.jsx'
import TripsEmpty from './pages/TripsEmpty.jsx'
import Placeholder from './pages/Placeholder.jsx'
import Join from './pages/Join.jsx'

function parseRoute(hash) {
  const path = hash.replace(/^#/, '') || '/'
  const joinMatch = path.match(/^\/join\/([^/]+)$/)
  if (joinMatch) return { page: 'join', token: decodeURIComponent(joinMatch[1]) }
  const tripMatch = path.match(/^\/trips\/(\d+)$/)
  if (tripMatch) return { page: 'details', tripId: Number(tripMatch[1]) }
  if (path === '/trips') return { page: 'trips-empty' }
  if (path === '/create') return { page: 'create' }
  if (path === '/split') return { page: 'split' }
  if (path === '/members') return { page: 'members' }
  return { page: 'home' }
}

const TAB_FOR_PAGE = {
  home: 'dashboard',
  'trips-empty': 'trips',
  details: 'trips',
  create: 'trips',
  split: 'split',
  members: 'members',
}

function ScaffoldBar({ userId, onChange }) {
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
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))
  const [userId, setUserId] = useState(1)
  const [lastTripId, setLastTripId] = useState(null)
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