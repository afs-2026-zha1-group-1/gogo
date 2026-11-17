import type { ReactNode } from "react"
import { useLocation, useParams } from "react-router-dom"
import { useSplitNavigate } from "./split-navigation"
import TabBar from "@/TabBar"
import { StepBar } from "@/components/ui/step-bar"
import { IconArrowLeft } from "@/components/icons"

/**
 * Split-flow app shell (ui-design-reference three-part skeleton: appbar -> body -> actionbar).
 * Rendered as a centered mobile-width column on the warm stage, with an optional 4-segment stepbar
 * and the shared identity bar. The header/footer are fixed; the body scrolls. Each screen supplies
 * its title/subtitle, step, back target, appbar right slot and bottom action.
 */
export function SplitLayout({
  title,
  subtitle,
  step,
  backTo,
  right,
  action,
  showTabBar = false,
  children,
}: {
  title: string
  subtitle?: string
  step?: number
  backTo?: string
  right?: ReactNode
  action?: ReactNode
  showTabBar?: boolean
  children: ReactNode
}) {
  const navigate = useSplitNavigate()
  const { tripId } = useParams()
  const { search } = useLocation()
  const dashboardOrigin = new URLSearchParams(search).get("from") === "dashboard"
  return (
    <div className="flex min-h-screen justify-center bg-bg">
      <div className="flex h-screen w-full max-w-[440px] flex-col overflow-hidden bg-surface-2 shadow-[0_0_40px_rgba(28,25,23,0.06)]">
        <header className="flex-none border-b border-line-2 bg-surface/85 px-4 pt-4 pb-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {backTo ? (
              <button
                type="button"
                onClick={() => navigate(backTo)}
                aria-label="返回"
                className="grid size-[34px] shrink-0 place-items-center rounded-[11px] border border-line bg-surface text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink [&_svg]:size-4"
              >
                <IconArrowLeft />
              </button>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16.5px] font-bold tracking-tight text-ink">{title}</div>
              {subtitle ? (
                <div className="mt-0.5 truncate text-[11.5px] font-medium text-ink-3">{subtitle}</div>
              ) : null}
            </div>
            {right}
          </div>
          {step != null ? <StepBar step={step} className="mt-3" /> : null}
        </header>

        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-6">{children}</main>

        {action ? (
          <footer className="flex flex-none gap-2.5 border-t border-line-2 bg-surface/95 px-4 py-3 backdrop-blur-md">
            {action}
          </footer>
        ) : null}

        {showTabBar ? (
          <TabBar
            fullPage
            active="split"
            tripsHref={dashboardOrigin ? "#/dashboard/trip-entry" : "#/trips"}
            splitHref={tripId ? `/trips/${tripId}/split${dashboardOrigin ? "?from=dashboard" : ""}` : "#/trips"}
          />
        ) : null}
      </div>
    </div>
  )
}