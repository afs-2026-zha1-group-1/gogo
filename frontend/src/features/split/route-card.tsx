import type { GroupRoute } from "./types"
import { cardRowOrder } from "./route-rows"
import { cleanRouteName, cleanStationName } from "./station-name"
import { Card } from "@/components/ui/card"
import { IconFlag, IconNav } from "@/components/icons"
import { formatCost } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * One generated group route (ui-design-reference Screen 13 `.route`): a dual-color header with the
 * group code, activity name and departure->reunion stops, a compact duration breakdown (activity /
 * each travel leg / buffer) and a green reunion footer. Each stop row also shows the group's per-person
 * cost, so read-only cards keep time and budget in one place. Pure display of backend-returned values;
 * tone A=blue, B=orange. {@code stale} marks a route whose group is now empty (the pair needs regenerating)
 * with a soft translucent pill in the header, matching the Screen 13 visual language. {@code windowMinutes}
 * renders the total against the saved window so an over-window pair is visible before confirmation.
 */
export function RouteCard({
  route,
  tone,
  departureName,
  originName = null,
  reunionName,
  reunionClock,
  destination = null,
  stale = false,
  windowMinutes,
}: {
  route: GroupRoute
  tone: "a" | "b"
  departureName: string
  originName?: string | null
  reunionName: string
  reunionClock: string
  destination?: string | null
  stale?: boolean
  windowMinutes?: number | null
}) {
  const head = tone === "a" ? "from-a to-[#2f6a5a]" : "from-b to-[#8f5f42]"
  const legsTotal = route.travelLegsMinutes.reduce((sum, minutes) => sum + minutes, 0)
  const legsKnown = route.travelLegsMinutes.every((minutes) => minutes != null)
  const total = route.activityMinutes != null && route.bufferMinutes != null && legsKnown
    ? route.activityMinutes + legsTotal + route.bufferMinutes
    : null
  const overrun = total != null && windowMinutes != null ? Math.max(0, total - windowMinutes) : null
  // Match each stop to its costed activity by name; leftovers stay visible as extra costs.
  const activities = route.activities ?? []
  const used = new Set<number>()
  const stepCosts = (route.steps ?? []).map((step) => {
    const index = activities.findIndex(
      (activity, position) => !used.has(position) && cleanStationName(activity.name) === cleanStationName(step.name),
    )
    if (index >= 0) used.add(index)
    return index >= 0 ? activities[index] : null
  })
  const extras = activities.filter((_, position) => !used.has(position))
  const activitiesCost = activities.reduce((sum, activity) => sum + activity.costCents, 0)

  return (
    <Card className="overflow-hidden">
      <div className={cn("flex items-center gap-3 bg-gradient-to-r px-4 py-3 text-white", head)}>
        <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-white/25 text-sm font-extrabold">
          {route.groupLabel}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold">{cleanRouteName(route.activityName) || "未命名活动"}</div>
          <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-white/85">
            <IconNav className="size-3" /> {departureName} → {reunionName}
          </div>
        </div>
        {stale ? (
          <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white/90">
            待重新生成
          </span>
        ) : overrun != null ? (
          <span className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold",
            overrun > 0 ? "bg-white text-[#b95a55]" : "bg-white/20 text-white",
          )}>
            {overrun > 0 ? `超窗 ${overrun} 分` : `合计 ${total} 分`}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5 px-4 py-3 text-[12px]">
        {route.steps && route.steps.length > 0 ? (
          cardRowOrder(route.steps.length, route.travelLegsMinutes.length).map((row) => {
            if (row.kind === "origin") {
              return originName ? <OriginRow key="origin" name={originName} /> : null
            }
            if (row.kind === "leg") {
              return (
                <Row
                  key={`${route.groupLabel}-leg-${row.leg}`}
                  label="路程"
                  value={`${route.travelLegsMinutes[row.leg]} 分`}
                  italic
                />
              )
            }
            const step = route.steps?.[row.step]
            return (
              <Row
                key={`${route.groupLabel}-step-${row.step}`}
                label={cleanStationName(step?.name)}
                value={`${step?.minutes} 分`}
                meta={stepCosts[row.step] ? formatCost(stepCosts[row.step]!.costCents, destination) : undefined}
              />
            )
          })
        ) : (
          <>
            <Row label="活动" value={`${route.activityMinutes} 分`} />
            {route.travelLegsMinutes.map((minutes, index) => (
              <Row key={`${route.groupLabel}-leg-${index}`} label="路程" value={`${minutes} 分`} italic />
            ))}
          </>
        )}
        {extras.length > 0 ? (
          <div className="flex flex-col gap-1.5 border-t border-line-2 pt-1.5">
            <span className="text-[10px] font-semibold text-ink-3">其他费用（不占时间）</span>
            {extras.map((extra, index) => (
              <Row
                key={`${route.groupLabel}-extra-${index}`}
                label={cleanStationName(extra.name)}
                value=""
                meta={formatCost(extra.costCents, destination)}
              />
            ))}
          </div>
        ) : null}
        {route.bufferMinutes ? <Row label="缓冲" value={`${route.bufferMinutes} 分`} /> : null}
        {total != null && (
          <Row label="合计" value={`${total} 分${windowMinutes != null ? ` / 窗口 ${windowMinutes} 分` : ""}`} />
        )}
        {activitiesCost > 0 ? <Row label="人均" value={formatCost(activitiesCost, destination)} /> : null}
      </div>

      <div className="flex items-center gap-2 border-t border-line-2 bg-ok-soft px-4 py-2.5 text-[12px] font-semibold text-[#2e8061]">
        <IconFlag className="size-3.5" /> {reunionClock} {reunionName}会合
      </div>
    </Card>
  )
}

function Row({ label, value, meta, italic }: { label: string; value: string; meta?: string; italic?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={cn("min-w-0 truncate text-ink-2", italic && "italic")}>{label}</span>
      <span className="flex shrink-0 items-center gap-2">
        {meta ? <span className="tabular-nums font-semibold text-ink">{meta}</span> : null}
        {value ? <span className={cn("font-bold text-ink", meta && "text-ink-2")}>{value}</span> : null}
      </span>
    </div>
  )
}

/** Where this group sets off from; shown only when its first row is a travel leg (US-095). */
function OriginRow({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-1 text-[11px] font-semibold text-ink-3">
      <IconNav className="size-3 shrink-0" /> 从 {name} 出发
    </div>
  )
}