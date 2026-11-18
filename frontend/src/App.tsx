import { useCallback, useEffect, useRef, useState } from 'react'
import type { InAppPage, Route, TabId } from './types'
import TabBar from './TabBar'
import Home from './pages/Home'
import CreateTrip from './pages/CreateTrip'
import EditTrip from './pages/EditTrip'
import TripDetails from './pages/TripDetails'
import TripsList from './pages/TripsList'
import CurrentTrip from './pages/CurrentTrip'
import TripsEmpty from './pages/TripsEmpty'
import { api } from './api'
import { isCurrentTripResponse } from './lib/current-trip'
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
import SessionNotice from './components/SessionNotice'

function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/'
  // Scanner owns its top-level hash and must be matched before the
  // generic `/trips/<id>` regex (design D1).
  if (path === '/scan') return { page: 'scan' }
  const joinMatch = path.match(/^\/join\/([^/]+)$/)
  if (joinMatch) return { page: 'join', token: decodeURIComponent(joinMatch[1]) }
  if (path === '/login') return { page: 'login' }
  if (path === '/register') return { page: 'register' }
  if (path === '/account') return { page: 'account' }
  if (path === '/my-preferences') return { page: 'my-preferences' }
  if (path === '/dashboard/trip-entry') return { page: 'dashboard-trip-guard' }
  const dashboardInviteMatch = path.match(/^\/dashboard\/trips\/(\d+)\/invite$/)
  if (dashboardInviteMatch) {
    const tripId = Number(dashboardInviteMatch[1])
    if (Number.isSafeInteger(tripId) && tripId > 0) {
      return { page: 'invitation', tripId, dashboardOrigin: true }
    }
    return { page: 'dashboard-trip', tripId: null }
  }
  const dashboardInputsMatch = path.match(/^\/dashboard\/trips\/(\d+)\/main-plan\/inputs(\?from=dashboard)?$/)
  if (dashboardInputsMatch) {
    const tripId = Number(dashboardInputsMatch[1])
    if (Number.isSafeInteger(tripId) && tripId > 0) {
      return { page: 'main-plan-inputs', tripId, dashboardOrigin: true, backToDashboard: Boolean(dashboardInputsMatch[2]) }
    }
    return { page: 'dashboard-trip', tripId: null }
  }
  const dashboardPlanMatch = path.match(/^\/dashboard\/trips\/(\d+)\/main-plan$/)
  if (dashboardPlanMatch) {
    const tripId = Number(dashboardPlanMatch[1])
    if (Number.isSafeInteger(tripId) && tripId > 0) {
      return { page: 'main-plan', tripId, dashboardOrigin: true }
    }
    return { page: 'dashboard-trip', tripId: null }
  }
  const dashboardPreferencesMatch = path.match(/^\/dashboard\/trips\/(\d+)\/preferences$/)
  if (dashboardPreferencesMatch) {
    const tripId = Number(dashboardPreferencesMatch[1])
    if (Number.isSafeInteger(tripId) && tripId > 0) {
      return { page: 'preferences', tripId, dashboardOrigin: true }
    }
    return { page: 'dashboard-trip', tripId: null }
  }
  if (path.startsWith('/dashboard/trips/')) {
    const value = path.slice('/dashboard/trips/'.length)
    const tripId = /^\d+$/.test(value) ? Number(value) : NaN
    return { page: 'dashboard-trip', tripId: Number.isSafeInteger(tripId) && tripId > 0 ? tripId : null }
  }
  const mainPlanInputsMatch = path.match(/^\/trips\/(\d+)\/main-plan\/inputs$/)
  if (mainPlanInputsMatch) return { page: 'main-plan-inputs', tripId: Number(mainPlanInputsMatch[1]) }
  const mainPlanMatch = path.match(/^\/trips\/(\d+)\/main-plan$/)
  if (mainPlanMatch) return { page: 'main-plan', tripId: Number(mainPlanMatch[1]) }
  const memberPreferencesMatch = path.match(/^\/trips\/(\d+)\/members\/(\d+)\/preferences$/)
  if (memberPreferencesMatch) {
    return {
      page: 'preferences',
      tripId: Number(memberPreferencesMatch[1]),
      memberId: Number(memberPreferencesMatch[2]),
    }
  }
  const preferencesMatch = path.match(/^\/trips\/(\d+)\/preferences$/)
  if (preferencesMatch) return { page: 'preferences', tripId: Number(preferencesMatch[1]) }
  // US-083 R4: the invitation page is trip-scoped; match before the generic `/trips/<id>`.
  const invitationMatch = path.match(/^\/trips\/(\d+)\/invitation$/)
  if (invitationMatch) return { page: 'invitation', tripId: Number(invitationMatch[1]) }
  // US-003: the edit route must match before the generic `/trips/<id>` regex
  // (US-067 D1 lesson), otherwise it is swallowed by the details route.
  const tripEditMatch = path.match(/^\/trips\/(\d+)\/edit$/)
  if (tripEditMatch) return { page: 'trip-edit', tripId: Number(tripEditMatch[1]) }
  const tripMatch = path.match(/^\/trips\/(\d+)$/)
  if (tripMatch) return { page: 'details', tripId: Number(tripMatch[1]) }
  if (path === '/my-trips') return { page: 'my-trips' }
  if (path === '/trips') return { page: 'trips-current' }
  if (path === '/create') return { page: 'create' }
  if (path === '/members') return { page: 'members' }
  return { page: 'home' }
}

function isDashboardRoute(route: Route): boolean {
  return route.page === 'home' || route.page === 'dashboard-trip'
    || route.page === 'dashboard-trip-guard'
    || route.page === 'invitation'
    || ((route.page === 'main-plan' || route.page === 'main-plan-inputs' || route.page === 'preferences')
      && route.dashboardOrigin === true)
}

const TAB_FOR_PAGE: Record<InAppPage, TabId> = {
  home: 'dashboard',
  'dashboard-trip': 'dashboard',
  'dashboard-trip-guard': 'trips',
  'my-trips': 'trips',
  'trips-current': 'trips',
  details: 'trips',
  'trip-edit': 'trips',
  create: 'trips',
  members: 'members',
  account: 'account',
}

export default function App() {
  const { status, account } = useAuth()
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash))
  const [lastTripId, setLastTripId] = useState<number | null>(null)
  const [pickerReadBlocked, setPickerReadBlocked] = useState(false)
  const [pickerWritePending, setPickerWritePending] = useState(false)
  const [dashboardContext, setDashboardContext] = useState(() => isDashboardRoute(route)
    || (['split', 'members', 'account', 'create', 'scan'].includes(route.page)
      && sessionStorage.getItem('gogo:dashboard-context') === 'true'))
  const [dashboardSelectionAttempted, setDashboardSelectionAttempted] = useState(
    () => route.page === 'dashboard-trip' || route.page === 'invitation'
      || ((route.page === 'main-plan' || route.page === 'main-plan-inputs') && route.dashboardOrigin === true)
      || (dashboardContext
      && sessionStorage.getItem('gogo:dashboard-selection-attempted') === 'true'),
  )
  const previousAccountId = useRef<number | null>(null)
  const currentAccountId = useRef<number | null>(null)
  const pickerSelectionId = useRef(0)
  currentAccountId.current = account?.id ?? null
  const dashboardSelection = useRef<{ accountId: number; tripId: number } | null>(null)
  const explicitTripContext = useRef(false)
  const handleDashboardReady = useCallback((tripId: number) => {
    if (!account) return
    dashboardSelection.current = { accountId: account.id, tripId }
    explicitTripContext.current = true
    setLastTripId(tripId)
  }, [account?.id])
  useEffect(() => {
    const onHash = () => {
      const parsed = parseRoute(window.location.hash)
      if (isDashboardRoute(parsed)) {
        setDashboardContext(true)
        if (parsed.page === 'dashboard-trip' || parsed.page === 'invitation'
          || ((parsed.page === 'main-plan' || parsed.page === 'main-plan-inputs') && parsed.dashboardOrigin)) {
          setDashboardSelectionAttempted(true)
        }
      } else if (parsed.page === 'my-trips' || parsed.page === 'trips-current'
        || parsed.page === 'details'
        || (parsed.page === 'main-plan-inputs' && !parsed.dashboardOrigin)
        || (parsed.page === 'main-plan' && !parsed.dashboardOrigin)
        || (parsed.page === 'preferences' && !parsed.dashboardOrigin)) {
        setDashboardContext(false)
        setDashboardSelectionAttempted(false)
      }
      setRoute(parsed)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    setLastTripId(null)
    setPickerReadBlocked(false)
    setPickerWritePending(false)
    pickerSelectionId.current += 1
    dashboardSelection.current = null
    explicitTripContext.current = false
    if (account && previousAccountId.current !== null && previousAccountId.current !== account.id) {
      setDashboardSelectionAttempted(dashboardContext)
    }
    if (account) previousAccountId.current = account.id
  }, [account?.id])

  useEffect(() => {
    sessionStorage.setItem('gogo:dashboard-context', String(dashboardContext))
    sessionStorage.setItem('gogo:dashboard-selection-attempted', String(dashboardSelectionAttempted))
  }, [dashboardContext, dashboardSelectionAttempted])

  const dashboardTripId = route.page === 'dashboard-trip' ? route.tripId : null
  useEffect(() => {
    if (route.page === 'dashboard-trip' || route.page === 'home') {
      dashboardSelection.current = null
      explicitTripContext.current = false
      setLastTripId(null)
    }
  }, [route.page, dashboardTripId])

  useEffect(() => {
    if ((route.page === 'main-plan' || route.page === 'main-plan-inputs') && route.dashboardOrigin) {
      const selected = dashboardSelection.current
      if (!selected || selected.accountId !== account?.id || selected.tripId !== route.tripId) {
        explicitTripContext.current = false
        setLastTripId(null)
      }
    } else if (route.page === 'my-trips') {
      explicitTripContext.current = false
      setLastTripId(null)
    } else if (route.page === 'details' || route.page === 'main-plan' || route.page === 'main-plan-inputs'
      || (route.page === 'preferences' && route.memberId != null)) {
      explicitTripContext.current = true
      setLastTripId(route.tripId)
    }
  }, [route, account?.id])

  // US-071 revision: the current trip is server-side; seed lastTripId from it so the
  // split tab and roster back links follow the account's selection.
  useEffect(() => {
    if (status !== 'signedIn' || !account || dashboardSelectionAttempted || pickerReadBlocked
      || explicitTripContext.current
      || route.page === 'home' || route.page === 'dashboard-trip' || route.page === 'details'
      || route.page === 'main-plan' || route.page === 'main-plan-inputs' || route.page === 'my-trips') return
    let active = true
    api<unknown>('/api/trips/current')
      .then((result) => {
        if (!active) return
        if (!result.ok || !isCurrentTripResponse(result.data)) {
          setLastTripId(null)
          console.error('Unable to load the current trip')
        } else {
          setLastTripId(result.data.tripId)
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setLastTripId(null)
          console.error('Unable to load the current trip', cause)
        }
      })
    return () => {
      active = false
    }
  }, [status, account?.id, route.page, dashboardSelectionAttempted, pickerReadBlocked])

  const tripsHref = '#/trips'
  const tripHref = lastTripId != null
    ? dashboardContext ? `#/dashboard/trips/${lastTripId}` : `#/trips/${lastTripId}`
    : tripsHref
  // 分队 tab goes straight to the team-route page (US-086); without a current trip,
  // fall back to the trip list so the member can pick one first.
  const splitHref = lastTripId != null
    ? `/trips/${lastTripId}/split${dashboardContext ? '?from=dashboard' : ''}`
    : dashboardContext ? '#/dashboard/trip-entry' : tripsHref

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
        <Scanner />
      </div>
    )
  }

  if (route.page === 'preferences') {
    return (
      <div className="app">
        <PreferencesPage
          tripId={route.tripId}
          memberId={route.memberId}
          backHref={
            route.memberId != null
              ? '#/members'
              : route.dashboardOrigin
                ? `#/dashboard/trips/${route.tripId}`
                : undefined
          }
        />
      </div>
    )
  }

  if (route.page === 'invitation') {
    return (
      <div className="app">
        <InvitationPage
          tripId={route.tripId}
          backHref={route.dashboardOrigin ? `#/dashboard/trips/${route.tripId}` : undefined}
        />
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
      <SessionNotice />
      <div className="shell-content">
        {route.page === 'home' && (
          <Home key={`${account.id}-current`} onTripReady={handleDashboardReady} selectionInFlight={pickerWritePending} />
        )}
        {route.page === 'dashboard-trip' && (
          <Home key={`${account.id}-${route.tripId}`} tripId={route.tripId} onTripReady={handleDashboardReady} />
        )}
        {route.page === 'create' && <CreateTrip backHref={tripsHref} />}
        {route.page === 'details' && <TripDetails tripId={route.tripId} />}
        {route.page === 'trip-edit' && <EditTrip tripId={route.tripId} backHref={tripsHref} />}
        {/* US-031/037: the main plan lives inside the shell so the bottom
            navigation stays visible when users arrive from the "行程" tab. */}
        {route.page === 'main-plan' && <MainPlan tripId={route.tripId} dashboardOrigin={route.dashboardOrigin} />}
        {route.page === 'main-plan-inputs' && (
          <MainPlanInputs tripId={route.tripId} dashboardOrigin={route.dashboardOrigin} backToDashboard={route.backToDashboard} />
        )}
        {route.page === 'my-trips' && (
          <TripsList
            selectable
            selectionInFlight={pickerWritePending}
            onSelectionStart={() => {
              setLastTripId(null)
              setPickerReadBlocked(true)
              setPickerWritePending(true)
              pickerSelectionId.current += 1
              return pickerSelectionId.current
            }}
            onSelectionFinish={(selectionId, succeeded) => {
              if (currentAccountId.current === account.id && selectionId === pickerSelectionId.current) {
                setPickerWritePending(false)
                if (succeeded) setPickerReadBlocked(false)
              }
            }}
          />
        )}
        {route.page === 'trips-current' && <CurrentTrip />}
        {route.page === 'dashboard-trip-guard' && <TripsEmpty />}
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
