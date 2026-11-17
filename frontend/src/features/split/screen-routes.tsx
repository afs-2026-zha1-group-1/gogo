import { useParams } from "react-router-dom"
import { useSplitNavigate } from "./split-navigation"
import { useGenerateRoutes, useSplitDraft } from "./hooks"
import { SplitLayout } from "./split-layout"
import { EmptyState, ErrorState, LoadingState } from "./states"
import { RouteCard } from "./route-card"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconArrowRight, IconBranch, IconRoute, IconSparkle, IconUsers } from "@/components/icons"
import { formatClock } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Screen 13 — group routes (spec REQ-006). Groups come from the fixture partition and are shown as
 * label + headcount only (no members endpoint, so no names are guessed); group-movement controls are
 * intentionally not implemented this slice. Generate wires POST routes:generate (paired atomic);
 * failure / stale / boundaries-required / non-initiator rejections surface from the backend. The
 * paired route cards display backend-returned activity / travel legs / buffer and the reunion clock.
 */
export function ScreenRoutes() {
  const { tripId = "" } = useParams()
  const navigate = useSplitNavigate()
  const draft = useSplitDraft(tripId)
  const generate = useGenerateRoutes(tripId)
  const detail = draft.data

  const stopNames = new Map((detail?.mainPlanStops ?? []).map((stop) => [stop.id, stop.name]))
  const nameOf = (id: string | null) => (id ? (stopNames.get(id) ?? "未知节点") : "—")
  const routes = detail?.routes ?? []
  const hasPair = routes.length === 2
  const boundariesSaved = detail?.windowMinutes != null

  const action = (
    <>
      <Button
        variant="outline"
        className="flex-1"
        disabled={!boundariesSaved || generate.isPending}
        onClick={() => detail && generate.mutate({ draftVersion: detail.draftVersion })}
      >
        {generate.isPending ? "生成中…" : hasPair ? "重新生成" : "生成两条路线"} <IconSparkle />
      </Button>
      <Button className="flex-1" disabled={!hasPair} onClick={() => navigate(`/trips/${tripId}/split/timing`)}>
        下一步 <IconArrowRight />
      </Button>
    </>
  )

  return (
    <SplitLayout
      title="分组与路线"
      subtitle="成对生成 · 分组移动本期不开放"
      step={2}
      backTo={`/trips/${tripId}/split/boundaries`}
      action={action}
    >
      {draft.isPending ? (
        <LoadingState label="加载分组与路线…" />
      ) : draft.error ? (
        <ErrorState error={draft.error} onRetry={() => draft.refetch()} />
      ) : !detail ? (
        <EmptyState
          icon={<IconBranch />}
          title="尚未发起草稿"
          hint="请先发起草稿并保存边界，再生成路线。"
          action={
            <Button size="sm" onClick={() => navigate(`/trips/${tripId}/split`)}>
              去发起
            </Button>
          }
        />
      ) : !boundariesSaved ? (
        <EmptyState
          icon={<IconRoute />}
          title="尚未保存边界"
          hint="生成路线前需先保存出发与会合边界。"
          action={
            <Button size="sm" onClick={() => navigate(`/trips/${tripId}/split/boundaries`)}>
              去选择边界
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-ink">
              <IconUsers className="text-brand" /> 自动分组
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {Object.entries(detail.groups).map(([label, members]) => {
                const box =
                  label === "A" ? "border-a-line bg-a-soft" : label === "B" ? "border-b-line bg-b-soft" : "border-line bg-surface-3"
                const ink = label === "A" ? "text-a" : label === "B" ? "text-b" : "text-ink"
                return (
                  <div key={label} className={cn("rounded-card border p-3", box)}>
                    <div className={cn("text-[13px] font-extrabold", ink)}>{label} 组</div>
                    <div className="mt-1 text-[11.5px] text-ink-2">{members.length} 人</div>
                  </div>
                )
              })}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
              分组由夹具按偏好齐全分区；本期不开放成员移动控件（后端分组变更 → 版本递增语义仍成立）。
            </p>
          </Card>

          {hasPair ? (
            <div className="flex flex-col gap-3">
              {routes.map((route) => (
                <RouteCard
                  key={route.groupLabel}
                  route={route}
                  tone={route.groupLabel === "B" ? "b" : "a"}
                  departureName={nameOf(route.departureStopId)}
                  reunionName={nameOf(route.reunionStopId)}
                  reunionClock={formatClock(detail.reunionAt)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<IconSparkle />}
              title="尚未生成路线"
              hint="点击下方“生成两条路线”，后端将成对原子生成 A/B 路线（失败整对回滚）。"
            />
          )}

          {generate.error ? <ErrorState error={generate.error} /> : null}
        </div>
      )}
    </SplitLayout>
  )
}