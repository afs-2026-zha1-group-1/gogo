import { useParams } from "react-router-dom"
import { useSplitNavigate } from "./split-navigation"
import { useSplitDraft } from "./hooks"
import { SplitLayout } from "./split-layout"
import { EmptyState, ErrorState, LoadingState } from "./states"
import { TeamRouteGraph } from "./team-route-graph"
import { buildGraphRows, formatTime, PENDING_LABEL } from "./graph-model"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { IconAlert, IconArrowRight, IconBranch, IconCheck, IconClock, IconRoute } from "@/components/icons"

/**
 * Screen 13b — read-only team-route preview (spec US-076 + US-088 N6/N7/N9). Reached after the step-2 Next action
 * saved the route edits and the backend's timing check returned feasible=true. The page states exactly one verdict
 * (可确认 / 不可确认 / 已确认 · 已取消), lists why a plan cannot be confirmed instead of hiding behind a blank empty
 * state, keeps the graph as the only route presentation, and offers the single forward action to the review screen.
 * The client never judges feasibility itself: the verdict reflects status/boundaries/routes the backend returned.
 */
export function ScreenPreview() {
  const { tripId = "" } = useParams()
  const navigate = useSplitNavigate()
  const draft = useSplitDraft(tripId)
  const detail = draft.data
  const status = detail?.status ?? null
  const routes = detail?.routes ?? []

  const stops = (detail?.mainPlanStops ?? []).map((stop) => ({
    id: stop.id,
    name: stop.name,
    startLabel: formatTime(stop.startAt, "iso", detail?.destination),
    endLabel: formatTime(stop.endAt, "iso", detail?.destination),
  }))
  const model = buildGraphRows({
    stops,
    departureStopId: detail?.departureStopId ?? null,
    reunionStopId: detail?.reunionStopId ?? null,
    routes,
  })
  const hasPair = routes.length === 2
  const active = status === "active"
  const counts = {
    a: detail?.groups.A?.length ?? 0,
    b: detail?.groups.B?.length ?? 0,
  }

  // A blocked plan lists every missing precondition, so "不可确认" is never a dead end without an explanation.
  const blockedReasons: string[] = []
  if (detail && detail.windowMinutes == null) blockedReasons.push("尚未保存出发 / 会合边界")
  if (detail && !hasPair) blockedReasons.push("尚未生成 A/B 两条路线")
  if (detail && (counts.a === 0 || counts.b === 0)) blockedReasons.push("A/B 两组需各有至少一名成员")
  const confirmable = active && blockedReasons.length === 0

  const verdict = status === "confirmed"
    ? { label: "已确认", variant: "ok" as const }
    : status === "cancelled"
      ? { label: "已取消", variant: "warn" as const }
      : confirmable
        ? { label: "可确认", variant: "ok" as const }
        : { label: "不可确认", variant: "warn" as const }

  const action = active ? (
    confirmable ? (
      <Button className="flex-1" onClick={() => navigate(`/trips/${tripId}/split/confirm`)}>
        下一步 <IconArrowRight />
      </Button>
    ) : (
      <Button className="flex-1" disabled>
        下一步 <IconArrowRight />
      </Button>
    )
  ) : null

  return (
    <SplitLayout
      title="队伍路线预览"
      subtitle={active ? "只读预览 · 不能在此编辑路线" : "已结束的草稿 · 只读"}
      step={3}
      backTo={`/trips/${tripId}/split/routes`}
      action={action}
    >
      {draft.isPending ? (
        <LoadingState label="加载队伍路线…" />
      ) : draft.error ? (
        <ErrorState error={draft.error} onRetry={() => draft.refetch()} />
      ) : !detail ? (
        <EmptyState
          icon={<IconBranch />}
          title="尚未发起草稿"
          hint="请先发起草稿、保存边界并生成路线。"
          action={<Button size="sm" onClick={() => navigate(`/trips/${tripId}/split`)}>去发起</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={verdict.variant}>
                {verdict.variant === "ok" ? <IconCheck /> : <IconAlert />} {verdict.label}
              </Badge>
              <Badge variant="neutral">A 组 {counts.a} 人</Badge>
              <Badge variant="neutral">B 组 {counts.b} 人</Badge>
            </div>
            <span className="text-[10.5px] text-ink-3">
              {detail.departureStopId && detail.reunionStopId
                ? `${formatTime(detail.departureAt, "iso", detail.destination)} 分头 → ${formatTime(detail.reunionAt, "iso", detail.destination)} 会合${
                    detail.windowMinutes != null ? ` · 共 ${detail.windowMinutes} 分` : ""
                  }`
                : PENDING_LABEL}
            </span>
          </div>

          {hasPair ? (
            <TeamRouteGraph model={model} />
          ) : (
            <Card className="flex items-start gap-2.5 border-[#fde68a] bg-warn-soft p-3.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-warn/15 text-warn [&_svg]:size-4">
                <IconRoute />
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-[#b45309]">尚无完整路线对</div>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-2">
                  第 2 步保存路线并通过时间窗校验后，这里才会显示路线图。
                </p>
              </div>
            </Card>
          )}

          {active && blockedReasons.length > 0 ? (
            <Card className="p-3.5">
              <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink">
                <IconClock className="text-warn" /> 尚不可确认
              </div>
              <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4 text-[11.5px] leading-relaxed text-ink-2">
                {blockedReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <Button
                size="sm"
                variant="outline"
                className="mt-2.5"
                onClick={() => navigate(`/trips/${tripId}/split/routes`)}
              >
                返回分组与路线
              </Button>
            </Card>
          ) : null}

          {!active ? (
            <p className="px-1 text-[11px] leading-relaxed text-ink-3">
              草稿已{status === "confirmed" ? "确认" : "取消"}，此预览只读，不可再继续。
            </p>
          ) : confirmable ? (
            <p className="px-1 text-[11px] leading-relaxed text-ink-3">
              路线图是本页唯一的路线呈现；确认前请前往复核页，服务端会再次复算时间窗。
            </p>
          ) : null}
        </div>
      )}
    </SplitLayout>
  )
}
