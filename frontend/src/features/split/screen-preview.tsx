import { useParams } from "react-router-dom"
import { useSplitNavigate } from "./split-navigation"
import { useSplitDraft } from "./hooks"
import { SplitLayout } from "./split-layout"
import { EmptyState, ErrorState, LoadingState } from "./states"
import { TeamRouteGraph } from "./team-route-graph"
import { buildGraphRows, formatTime, PENDING_LABEL } from "./graph-model"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IconArrowRight, IconBranch, IconRoute } from "@/components/icons"

/**
 * Screen 13b — read-only team-route preview (spec US-088 N6/N7/N9, design DD9). Reached only after the step-2 Next
 * action saved the route edits and the backend's timing check returned feasible=true. It reuses the Screen 11 graph
 * (main line, fork, A/B branches with the edited A steps, reunion) and offers the single forward action to the
 * existing review/confirm screen; confirmed/cancelled drafts stay read-only with no forward action.
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

  const action = active && hasPair ? (
    <Button className="flex-1" onClick={() => navigate(`/trips/${tripId}/split/confirm`)}>
      前往复核并确认 <IconArrowRight />
    </Button>
  ) : null

  return (
    <SplitLayout
      title="队伍路线预览"
      subtitle="校验通过 · 只读预览"
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
      ) : !hasPair ? (
        <EmptyState
          icon={<IconRoute />}
          title="尚未生成两条路线"
          hint="请返回第 2 步生成并校验 A/B 路线。"
          action={<Button size="sm" onClick={() => navigate(`/trips/${tripId}/split/routes`)}>返回分组与路线</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="neutral">A 组 {counts.a} 人</Badge>
              <Badge variant="neutral">B 组 {counts.b} 人</Badge>
              {status === "confirmed" ? <Badge variant="ok">已确认</Badge> : null}
              {status === "cancelled" ? <Badge variant="warn">已取消</Badge> : null}
            </div>
            <span className="text-[10.5px] text-ink-3">
              {detail.departureStopId && detail.reunionStopId
                ? `${formatTime(detail.departureAt, "iso", detail.destination)} 分头 → ${formatTime(detail.reunionAt, "iso", detail.destination)} 会合${
                    detail.windowMinutes != null ? ` · 共 ${detail.windowMinutes} 分` : ""
                  }`
                : PENDING_LABEL}
            </span>
          </div>

          <TeamRouteGraph model={model} />

          {!active ? (
            <p className="px-1 text-[11px] leading-relaxed text-ink-3">
              草稿已{status === "confirmed" ? "确认" : "取消"}，此预览只读，不可再继续。
            </p>
          ) : (
            <p className="px-1 text-[11px] leading-relaxed text-ink-3">
              该预览由第 2 步保存后的路线生成；前往复核页后，服务端会再次复算时间窗。
            </p>
          )}
        </div>
      )}
    </SplitLayout>
  )
}
