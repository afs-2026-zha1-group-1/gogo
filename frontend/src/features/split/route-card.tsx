import type { GroupRoute } from "./types"
import { Card } from "@/components/ui/card"
import { IconFlag, IconNav } from "@/components/icons"
import { cn } from "@/lib/utils"

/**
 * One generated group route (ui-design-reference Screen 13 `.route`): a dual-color header with the
 * group code, activity name and departure->reunion stops, a compact duration breakdown (activity /
 * each travel leg / buffer) and a green reunion footer. Pure display of backend-returned values; tone A=blue,
 * B=orange. {@code stale} marks a route whose group is now empty (the pair needs regenerating) with a soft
 * translucent pill in the header, matching the Screen 13 visual language.
 */
export function RouteCard({
  route,
  tone,
  departureName,
  reunionName,
  reunionClock,
  stale = false,
}: {
  route: GroupRoute
  tone: "a" | "b"
  departureName: string
  reunionName: string
  reunionClock: string
  stale?: boolean
}) {
  const head = tone === "a" ? "from-a to-[#1e40af]" : "from-b to-[#9a3412]"
  const legsTotal = route.travelLegsMinutes.reduce((sum, minutes) => sum + minutes, 0)

  return (
    <Card className="overflow-hidden">
      <div className={cn("flex items-center gap-3 bg-gradient-to-r px-4 py-3 text-white", head)}>
        <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-white/25 text-sm font-extrabold">
          {route.groupLabel}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold">{route.activityName ?? "未命名活动"}</div>
          <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-white/85">
            <IconNav className="size-3" /> {departureName} → {reunionName}
          </div>
        </div>
        {stale ? (
          <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white/90">
            待重新生成
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5 px-4 py-3 text-[12px]">
        <Row label="活动" value={`${route.activityMinutes} 分`} />
        <Row label={`路程（${route.travelLegsMinutes.join(" + ")}）`} value={`${legsTotal} 分`} italic />
        <Row label="缓冲" value={`${route.bufferMinutes} 分`} />
      </div>

      <div className="flex items-center gap-2 border-t border-line-2 bg-ok-soft px-4 py-2.5 text-[12px] font-semibold text-[#047857]">
        <IconFlag className="size-3.5" /> {reunionClock} {reunionName}会合
      </div>
    </Card>
  )
}

function Row({ label, value, italic }: { label: string; value: string; italic?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={cn("text-ink-2", italic && "italic")}>{label}</span>
      <span className="shrink-0 font-bold text-ink">{value}</span>
    </div>
  )
}