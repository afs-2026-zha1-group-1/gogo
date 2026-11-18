import { useLocation, useNavigate } from "react-router-dom"

export function useSplitNavigate() {
  const navigate = useNavigate()
  const { search } = useLocation()
  const dashboardOrigin = new URLSearchParams(search).get("from") === "dashboard"
  return (target: string) => navigate(
    dashboardOrigin && !target.startsWith("/#") ? `${target}?from=dashboard` : target,
  )
}
