import { useEffect, useState, type ChangeEvent } from 'react'
import { users } from './api'
import Home from './pages/Home'
import CreateTrip from './pages/CreateTrip'
import TripDetails from './pages/TripDetails'
import Join from './pages/Join'

type Route =
  | { page: 'home' }
  | { page: 'create' }
  | { page: 'details'; tripId: number }
  | { page: 'join'; token: string }

function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/'
  const joinMatch = path.match(/^\/join\/([^/]+)$/)
  if (joinMatch) return { page: 'join', token: decodeURIComponent(joinMatch[1]) }
  const tripMatch = path.match(/^\/trips\/(\d+)$/)
  if (tripMatch) return { page: 'details', tripId: Number(tripMatch[1]) }
  if (path === '/create') return { page: 'create' }
  return { page: 'home' }
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash))
  const [userId, setUserId] = useState<number>(1)
  const user = users().find((candidate) => candidate.id === userId)

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <div className="app">
      <div className="scaffold-bar">
        <span className="scaffold-label">IDENTITY · SCAFFOLD（非登录）</span>
        <select
          aria-label="Demo identity"
          value={userId}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => setUserId(Number(event.target.value))}
        >
          {users().map((candidate) => (
            <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
          ))}
        </select>
      </div>
      {route.page === 'home' && <Home />}
      {route.page === 'create' && <CreateTrip userId={userId} />}
      {route.page === 'details' && <TripDetails userId={userId} tripId={route.tripId} />}
      {route.page === 'join' && <Join token={route.token} userId={userId} userName={user?.name} />}
    </div>
  )
}
