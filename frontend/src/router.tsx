import type { ComponentType } from "react"
import { createBrowserRouter, Navigate, useParams } from "react-router-dom"
import App from "./App.tsx"
import LoginPage from "./features/auth/LoginPage"
import RegisterPage from "./features/auth/RegisterPage"
import RequireAuth from "./features/auth/RequireAuth"
import { ScreenStart } from "./features/split/screen-start"
import { ScreenBoundary } from "./features/split/screen-boundary"
import { ScreenRoutes } from "./features/split/screen-routes"
import { ScreenTiming } from "./features/split/screen-timing"
import { ScreenConfirm } from "./features/split/screen-confirm"

/**
 * Remount a split screen whenever the trip changes so a previous trip's mutation errors and
 * snapshot inputs never leak into the next trip's view.
 */
function SplitKeyed({ Screen }: { Screen: ComponentType }) {
  const { tripId = "" } = useParams()
  return <Screen key={tripId} />
}

/**
 * App routes. "/" renders the hash-based shell App. Split routes require an authenticated session;
 * signed-out visitors are sent to /login. The flow runs Screen 11 start -> 12 boundaries -> 13 routes
 * -> 14 timing -> 15 review/confirm (US-049) with the initiator's cancel action (US-050) on Screen 15.
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
    element: <RequireAuth><SplitKeyed Screen={ScreenBoundary} /></RequireAuth>,
  },
  {
    path: "/trips/:tripId/split/routes",
    element: <RequireAuth><SplitKeyed Screen={ScreenRoutes} /></RequireAuth>,
  },
  {
    path: "/trips/:tripId/split/timing",
    element: <RequireAuth><SplitKeyed Screen={ScreenTiming} /></RequireAuth>,
  },
  {
    path: "/trips/:tripId/split/confirm",
    element: <RequireAuth><SplitKeyed Screen={ScreenConfirm} /></RequireAuth>,
  },
  { path: "*", element: <Navigate to="/" replace /> },
])
