import { useEffect, useState } from 'react'
import { users } from './api.js'
import Home from './pages/Home.jsx'
import CreateTrip from './pages/CreateTrip.jsx'
import TripDetails from './pages/TripDetails.jsx'

function parseRoute(hash) {
  const path = hash.replace(/^#/, '') || '/'
  const tripMatch = path.match(/^\/trips\/(\d+)$/)
  if (tripMatch) return { page: 'details', tripId: Number(tripMatch[1]) }
  if (path === '/create') return { page: 'create' }
  return { page: 'home' }
}

export default function App() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))
  const [userId, setUserId] = useState(1)

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="#/">GOGO</a>
        <label className="identity">
          <span className="muted">Demo identity (scaffold)</span>
          <select value={userId} onChange={(event) => setUserId(Number(event.target.value))}>
            {users().map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </label>
      </header>
      <main>
        {route.page === 'home' && <Home />}
        {route.page === 'create' && <CreateTrip userId={userId} />}
        {route.page === 'details' && <TripDetails userId={userId} tripId={route.tripId} />}
      </main>
    </div>
  )
}