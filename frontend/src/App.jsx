import { useEffect, useState } from 'react'
import { users } from './api.js'
import Home from './pages/Home.jsx'
import CreateTrip from './pages/CreateTrip.jsx'
import TripDetails from './pages/TripDetails.jsx'
import Join from './pages/Join.jsx'
import MainPlanInputs from './pages/MainPlanInputs.tsx'
import MainPlan from './pages/MainPlan.tsx'

function parseRoute(hash) {
  const path = hash.replace(/^#/, '') || '/'
  const joinMatch = path.match(/^\/join\/([^/]+)$/)
  if (joinMatch) return { page: 'join', token: decodeURIComponent(joinMatch[1]) }
  const inputsMatch = path.match(/^\/trips\/(\d+)\/main-plan\/inputs$/)
  if (inputsMatch) return { page: 'main-plan-inputs', tripId: Number(inputsMatch[1]) }
  const planMatch = path.match(/^\/trips\/(\d+)\/main-plan$/)
  if (planMatch) return { page: 'main-plan', tripId: Number(planMatch[1]) }
  const tripMatch = path.match(/^\/trips\/(\d+)$/)
  if (tripMatch) return { page: 'details', tripId: Number(tripMatch[1]) }
  if (path === '/create') return { page: 'create' }
  return { page: 'home' }
}

export default function App() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))
  const [userId, setUserId] = useState(1)
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
          onChange={(event) => setUserId(Number(event.target.value))}
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
      {route.page === 'main-plan-inputs' && <MainPlanInputs userId={userId} tripId={route.tripId} />}
      {route.page === 'main-plan' && <MainPlan userId={userId} tripId={route.tripId} />}
    </div>
  )
}
