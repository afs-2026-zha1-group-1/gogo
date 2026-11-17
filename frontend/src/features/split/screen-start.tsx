import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useMainPlan, useSplitDraft, useStartDraft, useTripMembers } from "./hooks"
import { SplitLayout } from "./split-layout"
import { ErrorState, LoadingState } from "./states"
import { TeamRouteGraph } from "./team-route-graph"
import { NodeDetailSheet } from "./node-detail-sheet"
import { buildNodeDetail } from "./node-detail"
import { actionForStatus, buildGraphRows, formatTime, type GraphRow, type StopInput } from "./graph-model"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { IconArrowRight, IconBranch, IconClock, IconInfo } from "@/components/icons"
import type { SplitDraftStatus } from "./types"

/**
 * Screen 11 — 队伍路线 (US-086). Read-only overview of the confirmed main line, the saved split
 * boundaries and the generated A/B routes. The top-right action is the only split entry and branches
 * on draft status (start -> boundaries, active -> boundaries, confirmed -> read-only review). Nodes
 * are display-only: no detail sheet, tasks, fees or locations (user ruling 2026-11-17).
 */
export function ScreenStart() {
  const { tripId = "" } = useParams()
  const navigate = useNavigate()
  const draftQuery = useSplitDraft(tripId)
  const detail = draftQuery.data ?? null
  const status: SplitDraftStatus | null = detail?.status ?? null
  const noDraft = !draftQuery.isPending && !draftQuery.error && (detail == null || status === "cancelled")
  const mainPlanQuery = useMainPlan(tripId, noDraft)
  const start = useStartDraft(tripId)
  const membersQuery = useTripMembers(tripId)
  const tooFewMembers = membersQuery.data != null && membersQuery.data.length < 2
  const [selectedNode, setSelectedNode] = useState<GraphRow | null>(null)

  const loading = draftQuery.isPending || (noDraft && mainPlanQuery.isPending)
  const loadError = draftQuery.error ?? (noDraft ? mainPlanQuery.error : null)

  const hasConfirmedMainPlan =
    detail != null && status !== "cancelled" ? true : mainPlanQuery.data?.confirmed === true

  const stops: StopInput[] =
    detail != null && status !== "cancelled"
      ? detail.mainPlanStops.map((stop) => ({
          id: stop.id,
          name: stop.name,
          startLabel: formatTime(stop.startAt, "iso"),
          endLabel: formatTime(stop.endAt, "iso"),
        }))
      : (mainPlanQuery.data?.stops ?? []).map((stop) => ({
          id: String(stop.seq),
          name: stop.name,
          startLabel: stop.startTime,
          endLabel: stop.endTime,
        }))

  const withDraft = detail != null && status !== "cancelled"
  const departureStopId = withDraft ? detail.departureStopId : null
  const reunionStopId = withDraft ? detail.reunionStopId : null
  const routes = withDraft ? detail.routes ?? [] : []
  const model = buildGraphRows({ stops, departureStopId, reunionStopId, routes })

  const groupCounts = {
    a: detail?.groups.A?.length ?? 0,
    b: detail?.groups.B?.length ?? 0,
  }
  const totalMembers = Object.values(detail?.groups ?? {}).reduce((sum, ids) => sum + ids.length, 0)
  const selectedDetail = selectedNode
    ? buildNodeDetail(selectedNode, { groupCounts, totalMembers })
    : null

  const hasBoundaries = model.forkRow != null && model.joinRow != null
  const awaitingBoundaries = status === "active" && !hasBoundaries
  const awaitingRoutes = status === "active" && hasBoundaries && routes.length === 0

  // A split needs two groups with at least one member each (US-040 S10-N); block the entry instead of
  // letting the user start a draft that can never be confirmed.
  const baseAction = actionForStatus(status, hasConfirmedMainPlan)
  const action = tooFewMembers ? { kind: "blocked" as const, label: "成员不足" } : baseAction
  const blocked = action.kind === "blocked"

  async function handleAction() {
    if (blocked) return
    if (action.kind === "boundaries") {
      navigate(`/trips/${tripId}/split/boundaries`)
      return
    }
    if (action.kind === "confirm") {
      navigate(`/trips/${tripId}/split/confirm`)
      return
    }
    try {
      await start.mutateAsync()
      navigate(`/trips/${tripId}/split/boundaries`)
    } catch {
      // start.error renders below; backend stays authoritative for uniqueness/prerequisites.
    }
  }

  return (
    <>
      <SplitLayout
      title="队伍路线"
      subtitle="本次行程仅一次分队"
      showTabBar
      right={
        <Button
          size="sm"
          onClick={handleAction}
          disabled={blocked || start.isPending}
          className="shrink-0"
        >
          {start.isPending ? "发起中…" : action.label}
          {action.kind === "start" || action.kind === "blocked" ? <IconBranch /> : <IconArrowRight />}
        </Button>
      }
    >
      {loading ? (
        <LoadingState label="加载队伍路线…" />
      ) : loadError ? (
        <ErrorState
          error={loadError}
          onRetry={() => {
            draftQuery.refetch()
            if (noDraft) mainPlanQuery.refetch()
          }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <Badge variant={status === "confirmed" ? "ok" : status === "active" ? "warn" : "neutral"}>
              {status === "confirmed"
                ? "分队已确认"
                : status === "active"
                  ? "分队草稿进行中"
                  : status === "cancelled"
                    ? "上次草稿已取消"
                    : "尚未发起分队"}
            </Badge>
            <span className="text-[10.5px] text-ink-3">
              {tooFewMembers
                ? "成员不足两名，暂不能分队"
                : blocked
                  ? "先确认主线方案"
                  : `点击右上角${action.kind === "confirm" ? "查看" : "进入"}分队`}
            </span>
          </div>

          {tooFewMembers ? (
            <Card className="flex items-start gap-2.5 border-[#fde68a] bg-warn-soft p-3.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-warn/15 text-warn [&_svg]:size-4">
                <IconInfo />
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-[#b45309]">无法分队：成员不足</div>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-2">
                  当前行程只有 {membersQuery.data?.length ?? 0} 名成员。分队需要 A/B 两组各至少一人，请先在「成员」页邀请至少一名其他成员。
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    window.location.href = `/#/trips/${tripId}`
                  }}
                >
                  返回行程详情
                </Button>
              </div>
            </Card>
          ) : null}

          {!hasConfirmedMainPlan ? (
            <Card className="border-brand-soft bg-brand-soft/40 p-4">
              <div className="flex items-start gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink [&_svg]:size-4">
                  <IconBranch />
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-brand-ink">主线方案未确认</div>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-2">
                    确认主线后才能发起分队；本页只读取已确认主线与分队草稿。
                  </p>
                  <a
                    className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-ink underline-offset-2 hover:underline"
                    href={`/#/trips/${tripId}/main-plan`}
                  >
                    去主线方案 <IconArrowRight className="size-3.5" />
                  </a>
                </div>
              </div>
            </Card>
          ) : stops.length === 0 ? (
            <Card className="p-4 text-center text-[12.5px] text-ink-3">已确认主线暂无节点，暂不能展示队伍路线。</Card>
          ) : (
            <>
              {hasBoundaries && detail ? (
                <div className="flex items-center gap-2 px-1 text-[10.5px] font-semibold text-ink-2">
                  <IconClock className="size-3.5 shrink-0 text-brand" />
                  <span className="shrink-0">{formatTime(detail.departureAt, "iso")} 分头</span>
                  <span className="min-w-4 flex-1 border-t border-dashed border-a-line" />
                  <span className="shrink-0">{formatTime(detail.reunionAt, "iso")} 会合</span>
                  {detail.windowMinutes != null ? (
                    <span className="shrink-0 text-ink-3">{formatWindow(detail.windowMinutes)}</span>
                  ) : null}
                </div>
              ) : null}

              <TeamRouteGraph model={model} onNodeClick={setSelectedNode} />

              {awaitingBoundaries ? (
                <HintCard title="待选择分头 / 会合边界" hint="选好边界后会显示分头、会合节点和中间暂停的主线。" />
              ) : null}
              {awaitingRoutes ? (
                <HintCard title="两条路线待生成" hint="生成 Route A / B 后会在这里展开两条分支的活动与时长。" />
              ) : null}
              {!withDraft ? (
                <HintCard
                  title={status === "cancelled" ? "草稿已取消，主线未变" : "尚未发起分队"}
                  hint={
                    status === "cancelled"
                      ? "右上角可发起替换草稿，重新选择边界与路线。"
                      : "右上角「发起分队」从已确认主线开始；A/B 路线生成后回到本页。"
                  }
                />
              ) : null}
            </>
          )}

          {start.error ? <ErrorState error={start.error} /> : null}
        </div>
      )}
    </SplitLayout>
      <NodeDetailSheet detail={selectedDetail} onClose={() => setSelectedNode(null)} />
    </>
  )
}

function HintCard({ title, hint }: { title: string; hint: string }) {
  return (
    <Card className="border-line-2 bg-surface-2 p-3.5">
      <div className="text-[12.5px] font-bold text-ink-2">{title}</div>
      <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">{hint}</p>
    </Card>
  )
}

function formatWindow(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours > 0 ? `${hours} 小时 ${rest} 分` : `${rest} 分`
}
