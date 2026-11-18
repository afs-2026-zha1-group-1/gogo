import type { ComponentType } from "react"
import { createBrowserRouter, Navigate, useParams } from "react-router-dom"
import App from "./App.tsx"
import LoginPage from "./features/auth/LoginPage"
import RegisterPage from "./features/auth/RegisterPage"
import RequireAuth from "./features/auth/RequireAuth"
import { ScreenStart } from "./features/split/screen-start"
import { ScreenBoundary } from "./features/split/screen-boundary"
import { ScreenRoutes } from "./features/split/screen-routes"
import { ScreenPreview } from "./features/split/screen-preview"
import { ScreenConfirm } from "./features/split/screen-confirm"

/**
 * Remount a split screen whenever the trip changes so a previous trip's mutation errors and
 * snapshot inputs never leak into the next trip's view.
 */
function SplitKeyed({ Screen }: { Screen: ComponentType }) {
  const { tripId = "" } = useParams()
  return <Screen key={tripId} />
}

/** Old Screen 14 deep links land on the read-only preview (US-088 N8/D-1). */
function SplitTimingRedirect() {
  const { tripId = "" } = useParams()
  return <Navigate to={`/trips/${tripId}/split/rounds/1/preview`} replace />
}

/** US-096: old round-less paths keep working by pointing at round 1. */
function LegacyRoundRedirect({ suffix }: { suffix: string }) {
  const { tripId = "" } = useParams()
  return <Navigate to={`/trips/${tripId}/split/rounds/1/${suffix}`} replace />
}

/**
 * App routes. "/" renders the hash-based shell App. Split routes require an authenticated session;
 * signed-out visitors are sent to /login. The flow runs Screen 11 start -> 12 boundaries -> 13 routes
 * -> 13b preview -> 15 review/confirm (US-088 supersedes the old Screen 14 timing page, which now
 * redirects) with the initiator's cancel action (US-050) on Screen 15.
 */
export const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/account", element: <Navigate to="/#/account" replace /> },
  {
    path: "/trips/:tripId/split",
    element: <RequireAuth><SplitKeyed Screen={ScreenStart} /></RequireAuth>,
  },
  {
    path: "/trips/:tripId/split/boundaries",
    element: <RequireAuth><LegacyRoundRedirect suffix="boundaries" /></RequireAuth>,
  },
  {
    path: "/trips/:tripId/split/routes",
    element: <RequireAuth><LegacyRoundRedirect suffix="routes" /></RequireAuth>,
  },
  {
    path: "/trips/:tripId/split/preview",
    element: <RequireAuth><LegacyRoundRedirect suffix="preview" /></RequireAuth>,
  },
  {
    path: "/trips/:tripId/split/timing",
    element: <RequireAuth><SplitTimingRedirect /></RequireAuth>,
  },
  {
    path: "/trips/:tripId/split/confirm",
    element: <RequireAuth><LegacyRoundRedirect suffix="confirm" /></RequireAuth>,
  },
  {
    path: "/trips/:tripId/split/rounds/:roundIndex/boundaries",
    element: <RequireAuth><SplitKeyed Screen={ScreenBoundary} /></RequireAuth>,
  },
  {
    path: "/trips/:tripId/split/rounds/:roundIndex/routes",
    element: <RequireAuth><SplitKeyed Screen={ScreenRoutes} /></RequireAuth>,
  },
  {
    path: "/trips/:tripId/split/rounds/:roundIndex/preview",
    element: <RequireAuth><SplitKeyed Screen={ScreenPreview} /></RequireAuth>,
  },
  {
    path: "/trips/:tripId/split/rounds/:roundIndex/confirm",
    element: <RequireAuth><SplitKeyed Screen={ScreenConfirm} /></RequireAuth>,
  },
  { path: "*", element: <Navigate to="/" replace /> },
])
