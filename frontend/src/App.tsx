import { useEffect, useState } from 'react'
import type { CurrentTripResponse, InAppPage, Route, TabId } from './types'
import TabBar from './TabBar'
import Home from './pages/Home'
import CreateTrip from './pages/CreateTrip'
import TripDetails from './pages/TripDetails'
import TripsList from './pages/TripsList'
import CurrentTrip from './pages/CurrentTrip'
import { api } from './api'
import Join from './pages/Join'
import MainPlan from './pages/MainPlan'
import MainPlanInputs from './pages/MainPlanInputs'
import Scanner from './pages/Scanner'
import PreferencesPage from './pages/PreferencesPage'
import InvitationPage from './pages/InvitationPage'
import UserPreferencesPage from './pages/UserPreferencesPage'
import Members from './pages/Members'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import AccountPage from './features/auth/AccountPage'
import { useAuth } from './features/auth/AuthProvider'

function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/'
  // Scanner owns its top-level hash and must be matched before the
  // generic `/trips/<id>` regex (design D1); `from` is filled in by the
  // App state tracker below, so parseRoute only signals the shape here.
  if (path === '/scan') return { page: 'scan', from: null }
  const joinMatch = path.match(/^\/join\/([^/]+)$/)
  if (joinMatch) return { page: 'join', token: decodeURIComponent(joinMatch[1]) }
  if (path === '/login') return { page: 'login' }
  if (path === '/register') return { page: 'register' }
  if (path === '/account') return { page: 'account' }
  if (path === '/my-preferences') return { page: 'my-preferences' }
  const mainPlanInputsMatch = path.match(/^\/trips\/(\d+)\/main-plan\/inputs$/)
  if (mainPlanInputsMatch) return { page: 'main-plan-inputs', tripId: Number(mainPlanInputsMatch[1]) }
  const mainPlanMatch = path.match(/^\/trips\/(\d+)\/main-plan$/)
  if (mainPlanMatch) return { page: 'main-plan', tripId: Number(mainPlanMatch[1]) }
  const preferencesMatch = path.match(/^\/trips\/(\d+)\/preferences$/)
  if (preferencesMatch) return { page: 'preferences', tripId: Number(preferencesMatch[1]) }
  // US-083 R4: the invitation page is trip-scoped; match before the generic `/trips/<id>`.
  const invitationMatch = path.match(/^\/trips\/(\d+)\/invitation$/)
  if (invitationMatch) return { page: 'invitation', tripId: Number(invitationMatch[1]) }
  const tripMatch = path.match(/^\/trips\/(\d+)$/)
  if (tripMatch) return { page: 'details', tripId: Number(tripMatch[1]) }
  if (path === '/my-trips') return { page: 'my-trips' }
  if (path === '/trips') return { page: 'trips-current' }
  if (path === '/create') return { page: 'create' }
  if (path === '/members') return { page: 'members' }
  return { page: 'home' }
}

const TAB_FOR_PAGE: Record<InAppPage, TabId> = {
  home: 'dashboard',
  'my-trips': 'account',
  'trips-current': 'trips',
  details: 'trips',
  create: 'trips',
  members: 'members',
  account: 'account',
}

export default function App() {
  const { status, account } = useAuth()
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash))
  const [lastTripId, setLastTripId] = useState<number | null>(null)
  // Tracks the last non-scanner hash so closing the scanner can restore
  // the originating route (spec S-5 / design D2). Falls back to `#/` via
  // the Scanner close handler when this is null (user typed `#/scan`).
  const [lastNonScanHash, setLastNonScanHash] = useState<string | null>(() => {
    const initial = window.location.hash
    return initial && initial.replace(/^#/, '') !== '/scan' ? initial : null
  })

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
    if (route.page === 'details' || route.page === 'main-plan' || route.page === 'main-plan-inputs') {
      setLastTripId(route.tripId)
    }
  }, [route])

  // US-071 revision: the current trip is server-side; seed lastTripId from it so the
  // split tab and roster back links follow the account's selection.
  useEffect(() => {
    if (status !== 'signedIn' || !account) return
    let active = true
    api<CurrentTripResponse>('/api/trips/current')
      .then((result) => {
        if (active && result.ok && result.data?.tripId != null) setLastTripId(result.data.tripId)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [status, account?.id, route.page])

  // US-071: the bottom "行程" tab always opens the caller's trip list; trip-scoped
  // pages (roster back, main plan) still use their own `#/trips/<id>` links.
  const tripsHref = '#/trips'
  const tripHref = lastTripId != null ? `#/trips/${lastTripId}` : '#/trips'
  // 分队 tab goes straight to the team-route page (US-086); without a current trip,
  // fall back to the trip list so the member can pick one first.
  const splitHref = lastTripId != null ? `/trips/${lastTripId}/split` : tripsHref

  if (route.page === 'login') return <LoginPage />
  if (route.page === 'register') return <RegisterPage />

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

  // Scanner is a full-screen flow outside the shell + TabBar (design D1, C2).
  // Task 4.1 fills the UI surface and task 4.2 registers the #/scan hash
  // route in parseRoute. Scaffolding this branch here keeps InAppPage and
  // TAB_FOR_PAGE in sync so the union narrowing at line 117 stays sound.
  if (route.page === 'scan') {
    return (
      <div className="app">
        <Scanner from={route.from} />
      </div>
    )
  }

  if (route.page === 'preferences') {
    return (
      <div className="app">
        <PreferencesPage tripId={route.tripId} />
      </div>
    )
  }

  // US-083 R4 / app-shell delta: the invitation page is a full-screen flow
  // without the bottom dock, like preferences.
  if (route.page === 'invitation') {
    return (
      <div className="app">
        <InvitationPage tripId={route.tripId} />
      </div>
    )
  }

  if (route.page === 'my-preferences') {
    return (
      <div className="app">
        <UserPreferencesPage />
      </div>
    )
  }

  return (
    <div className="app">
      <div className="shell-content">
        {route.page === 'home' && <Home />}
        {route.page === 'create' && <CreateTrip backHref={tripsHref} />}
        {route.page === 'details' && <TripDetails tripId={route.tripId} />}
        {/* US-031/037: the main plan lives inside the shell so the bottom
            navigation stays visible when users arrive from the "行程" tab. */}
        {route.page === 'main-plan' && <MainPlan tripId={route.tripId} />}
        {route.page === 'main-plan-inputs' && <MainPlanInputs tripId={route.tripId} />}
        {route.page === 'my-trips' && <TripsList selectable />}
        {route.page === 'trips-current' && <CurrentTrip />}
        {route.page === 'members' && (
          <Members tripId={lastTripId} tripsHref={tripsHref} tripHref={tripHref} />
        )}
        {route.page === 'account' && <AccountPage />}
      </div>
      <TabBar
        active={
          route.page === 'main-plan' || route.page === 'main-plan-inputs'
            ? 'trips'
            : TAB_FOR_PAGE[route.page]
        }
        tripsHref={tripsHref}
        splitHref={splitHref}
      />
    </div>
  )
}
