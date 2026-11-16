import type { ComponentType } from "react"
import { createBrowserRouter, Navigate, useParams } from "react-router-dom"
import App from "./App.jsx"
import { useIdentity } from "./features/split/identity"
import { ScreenStart } from "./features/split/screen-start"
import { ScreenBoundary } from "./features/split/screen-boundary"
import { ScreenRoutes } from "./features/split/screen-routes"
import { ScreenTiming } from "./features/split/screen-timing"

/**
 * Remount a split screen whenever the trip or the trusted member identity changes, so a previous
 * identity's mutation errors (e.g. a 403) and once-initialized snapshot inputs never leak into the
 * next identity's view. The identity bar is the walkthrough affordance for permission states.
 */
function SplitKeyed({ Screen }: { Screen: ComponentType }) {
  const { memberId } = useIdentity()
  const { tripId = "" } = useParams()
  return <Screen key={`${tripId}:${memberId}`} />
}

/**
 * App routes (design D15). "/" keeps the untouched greeting App.jsx (R5 regression). The split flow
 * lives under /trips/:tripId/split/* so every screen reads tripId from the URL and the identity bar
 * can switch trips. Screen 11 start -> 12 boundaries -> 13 routes -> 14 timing. Confirm/cancel
 * (US-049/050) are out of scope, so the flow ends at timing. Unknown paths fall back to greeting.
 */
export const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/trips/:tripId/split", element: <SplitKeyed Screen={ScreenStart} /> },
  { path: "/trips/:tripId/split/boundaries", element: <SplitKeyed Screen={ScreenBoundary} /> },
  { path: "/trips/:tripId/split/routes", element: <SplitKeyed Screen={ScreenRoutes} /> },
  { path: "/trips/:tripId/split/timing", element: <SplitKeyed Screen={ScreenTiming} /> },
  { path: "*", element: <Navigate to="/" replace /> },
])