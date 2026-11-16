import { useState } from 'react'
import { HashRouter, Route, Routes, useParams } from 'react-router-dom'
import { users } from './api.js'
import Home from './pages/Home.jsx'
import CreateTrip from './pages/CreateTrip.jsx'
import TripDetails from './pages/TripDetails.jsx'
import Join from './pages/Join.jsx'
import PreferencesPage from './pages/PreferencesPage.tsx'

function TripDetailsRoute({ userId }) {
  const { tripId } = useParams()
  const id = Number(tripId)
  if (!Number.isFinite(id)) return <Home />
  return <TripDetails userId={userId} tripId={id} />
}

function PreferencesRoute({ userId }) {
  const { tripId } = useParams()
  return <PreferencesPage userId={userId} tripId={Number(tripId)} />
}

function JoinRoute({ userId }) {
  const { token } = useParams()
  const user = users().find((candidate) => candidate.id === userId)
  return <Join token={token} userId={userId} userName={user?.name} />
}

export default function App() {
  const [userId, setUserId] = useState(1)

  return (
    <HashRouter>
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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateTrip userId={userId} />} />
          <Route path="/trips/:tripId" element={<TripDetailsRoute userId={userId} />} />
          <Route path="/trips/:tripId/preferences" element={<PreferencesRoute userId={userId} />} />
          <Route path="/join/:token" element={<JoinRoute userId={userId} />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
    </HashRouter>
  )
}
