import { useState } from "react"
import { useLocation, useParams } from "react-router-dom"
import { useSplitNavigate } from "./split-navigation"
import { useMainPlan, useSplitRounds, useStartDraft, useStartNextRound, useTripMembers } from "./hooks"
import { SplitLayout } from "./split-layout"
import { ErrorState, LoadingState } from "./states"
import { TeamRouteGraph } from "./team-route-graph"
import { NodeDetailSheet } from "./node-detail-sheet"
import { buildNodeDetail } from "./node-detail"
import { buildGraphRows, formatTime, type GraphRow, type StopInput } from "./graph-model"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { IconArrowRight, IconBranch, IconClock, IconInfo } from "@/components/icons"
import type { SplitDraftDetail } from "./types"

/**
 * Screen 11 — 队伍路线 (US-086 + US-096). Read-only overview of the confirmed main line and one
 * card per split round. The graph only draws confirmed rounds (the confirmed agreement); an active
 * round is visible as a card and through its own round-scoped flow. The top-right action starts the
 * first round or the next round and resumes the active one.
 */
export function ScreenStart() {
  const { tripId = "" } = useParams()
  const navigate = useSplitNavigate()
  const { search } = useLocation()
  const dashboardOrigin = new URLSearchParams(search).get("from") === "dashboard"
  const roundsQuery = useSplitRounds(tripId)
  const rounds = roundsQuery.data?.rounds ?? []
  const noRounds = !roundsQuery.isPending && !roundsQuery.error && rounds.length === 0
  const mainPlanQuery = useMainPlan(tripId, noRounds)
  const startDraft = useStartDraft(tripId)
  const startNext = useStartNextRound(tripId)
  const membersQuery = useTripMembers(tripId)
  const tooFewMembers = membersQuery.data != null && membersQuery.data.length < 2
  const [selectedNode, setSelectedNode] = useState<GraphRow | null>(null)

  const loading = roundsQuery.isPending || (noRounds && mainPlanQuery.isPending)
  const loadError = roundsQuery.error ?? (noRounds ? mainPlanQuery.error : null)
  const hasConfirmedMainPlan = rounds.length > 0 || mainPlanQuery.data?.confirmed === true

  const source: SplitDraftDetail | null = rounds[0] ?? null
  const stops: StopInput[] = source
    ? source.mainPlanStops.map((stop) => ({
        id: stop.id,
        name: stop.name,
        startLabel: formatTime(stop.startAt, "iso", source.destination),
        endLabel: formatTime(stop.endAt, "iso", source.destination),
      }))
    : (mainPlanQuery.data?.stops ?? []).map((stop) => ({
        id: String(stop.seq),
        name: stop.name,
        startLabel: stop.startTime,
        endLabel: stop.endTime,
      }))

  const confirmedRounds = rounds.filter((round) => round.status === "confirmed")
  const model = buildGraphRows({
    stops,
    rounds: confirmedRounds.map((round) => ({
      roundIndex: round.roundIndex,
      departureStopId: round.departureStopId,
      reunionStopId: round.reunionStopId,
      routes: round.routes,
    })),
  })

  const lastRound = rounds[rounds.length - 1] ?? null
  const activeRound = rounds.find((round) => round.status === "active") ?? null
  const confirmedRound = [...rounds].reverse().find((round) => round.status === "confirmed") ?? null
  const gate = roundsQuery.data
  const blocked = tooFewMembers || !hasConfirmedMainPlan

  const groupCounts = {
    a: lastRound?.groups.A?.length ?? 0,
    b: lastRound?.groups.B?.length ?? 0,
  }
  const totalMembers = Object.values(lastRound?.groups ?? {}).reduce((sum, ids) => sum + ids.length, 0)
  const selectedDetail = selectedNode
    ? buildNodeDetail(selectedNode, { groupCounts, totalMembers })
    : null

  const pending = startDraft.isPending || startNext.isPending
  const actionLabel = tooFewMembers
    ? "成员不足"
    : !hasConfirmedMainPlan
      ? "发起分队"
      : activeRound
        ? `继续第 ${activeRound.roundIndex} 轮`
        : gate?.canStartNextRound
          ? rounds.length === 0 ? "发起分队" : "再次分队"
          : confirmedRound
            ? `查看第 ${confirmedRound.roundIndex} 轮`
            : "发起分队"

  async function handleAction() {
    if (blocked || pending) return
    if (activeRound) {
      navigate(`/trips/${tripId}/split/rounds/${activeRound.roundIndex}/boundaries`)
      return
    }
    if (gate?.canStartNextRound) {
      if (rounds.length === 0) {
        await startDraft.mutateAsync()
        navigate(`/trips/${tripId}/split/rounds/1/boundaries`)
        return
      }
      const created = await startNext.mutateAsync()
      navigate(`/trips/${tripId}/split/rounds/${created.roundIndex}/boundaries`)
      return
    }
    if (confirmedRound) {
      navigate(`/trips/${tripId}/split/rounds/${confirmedRound.roundIndex}/preview`)
    }
  }

  const aggregate = roundsQuery.data?.aggregateStatus ?? "absent"
  const statusLabel = aggregate === "confirmed"
    ? rounds.length > 1 ? `${rounds.length} 轮分队已确认` : "分队已确认"
    : aggregate === "active"
      ? "分队进行中"
      : aggregate === "cancelled"
        ? "上次分队已取消"
        : "尚未发起分队"
  const statusVariant = aggregate === "confirmed" ? "ok" : aggregate === "active" ? "brand" : aggregate === "cancelled" ? "warn" : "neutral"

  return (
    <>
      <SplitLayout
        title="队伍路线"
        subtitle={rounds.length > 1 ? "多次分头 · 按轮确认" : "本次行程可多次分队"}
        showTabBar
        backTo={dashboardOrigin ? `/#/dashboard/trips/${tripId}` : `/#/trips/${tripId}`}
        right={
          <Button
            size="sm"
            onClick={handleAction}
            disabled={blocked || pending}
            className="shrink-0"
          >
            {pending ? "处理中…" : actionLabel}
            {gate?.canStartNextRound && !activeRound ? <IconBranch /> : <IconArrowRight />}
          </Button>
        }
      >
        {loading ? (
          <LoadingState label="加载队伍路线…" />
        ) : loadError ? (
          <ErrorState
            error={loadError}
            onRetry={() => {
              roundsQuery.refetch()
              if (noRounds) mainPlanQuery.refetch()
            }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 px-1">
              <Badge variant={statusVariant}>{statusLabel}</Badge>
              <span className="text-[10.5px] text-ink-3">
                {tooFewMembers
                  ? "成员不足两名，暂不能分队"
                  : !hasConfirmedMainPlan
                    ? "先确认主线方案"
                    : gate?.nextRoundBlockedReason === "ROUND_LIMIT_REACHED"
                      ? "已达到 2 轮上限"
                      : `点击右上角${activeRound ? "继续" : confirmedRound ? "查看" : "进入"}分队`}
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
                      href={dashboardOrigin ? `/#/dashboard/trips/${tripId}/main-plan` : `/#/trips/${tripId}/main-plan`}
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
                {confirmedRounds.length > 0 ? (
                  <div className="flex items-center gap-2 px-1 text-[10.5px] font-semibold text-ink-2">
                    <IconClock className="size-3.5 shrink-0 text-brand" />
                    <span className="shrink-0">{formatTime(confirmedRounds[0].departureAt, "iso", confirmedRounds[0].destination)} 分头</span>
                    <span className="min-w-4 flex-1 border-t border-dashed border-a-line" />
                    <span className="shrink-0">
                      {confirmedRounds.map((round) => formatTime(round.reunionAt, "iso", round.destination)).join(" / ")} 会合
                    </span>
                  </div>
                ) : null}

                <TeamRouteGraph model={model} onNodeClick={setSelectedNode} />

                {rounds.map((round) => (
                  <RoundCard key={round.roundIndex} round={round} nameOf={(id) => membersQuery.data?.find((member) => String(member.userId) === id)?.displayName ?? id} onOpen={() => {
                    navigate(`/trips/${tripId}/split/rounds/${round.roundIndex}/${round.status === "active" ? "boundaries" : "preview"}`)
                  }} />
                ))}

                {rounds.length === 0 ? (
                  <HintCard title="尚未发起分队" hint="右上角「发起分队」从已确认主线开始；第一轮确认后可以再次分队。" />
                ) : null}

                {activeRound ? (
                  <HintCard
                    title={`第 ${activeRound.roundIndex} 轮进行中`}
                    hint="完成边界、分组与路线后由组织者确认；确认只冻结这一轮。"
                  />
                ) : null}

                {gate?.nextRoundBlockedReason === "ROUND_LIMIT_REACHED" ? (
                  <HintCard title="已达到 2 轮上限" hint="当前版本最多支持两次分队；第 3 轮会由服务端拒绝。" />
                ) : null}
              </>
            )}

            {startDraft.error || startNext.error ? <ErrorState error={startDraft.error ?? startNext.error} /> : null}
          </div>
        )}
      </SplitLayout>
      <NodeDetailSheet detail={selectedDetail} onClose={() => setSelectedNode(null)} />
    </>
  )
}

function RoundCard({ round, nameOf, onOpen }: { round: SplitDraftDetail; nameOf: (id: string) => string; onOpen: () => void }) {
  const statusVariant = round.status === "confirmed" ? "ok" : round.status === "active" ? "brand" : "warn"
  const statusLabel = round.status === "confirmed" ? "已确认" : round.status === "active" ? "进行中" : "已取消"
  const windowText = round.windowMinutes != null
    ? `${formatTime(round.departureAt, "iso", round.destination)} → ${formatTime(round.reunionAt, "iso", round.destination)} · ${formatWindow(round.windowMinutes)}`
    : "边界未保存"
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <button type="button" className="min-w-0 text-left" onClick={onOpen}>
          <div className="text-[13px] font-bold text-ink">第 {round.roundIndex} 次分队</div>
          <div className="mt-0.5 text-[10.5px] text-ink-3">{windowText}</div>
        </button>
        <Badge variant={statusVariant}>{statusLabel}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge variant="a">A · {round.groups.A?.map(nameOf).join(" / ") || "空"}</Badge>
        <Badge variant="b">B · {round.groups.B?.map(nameOf).join(" / ") || "空"}</Badge>
      </div>
    </Card>
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
