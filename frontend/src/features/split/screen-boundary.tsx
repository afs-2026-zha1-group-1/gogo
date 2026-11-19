import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { useSplitNavigate } from "./split-navigation"
import { useRoundIndex, useSaveBoundaries, useSplitDraft, useSplitRounds } from "./hooks"
import { SplitLayout } from "./split-layout"
import { EmptyState, ErrorState, LoadingState } from "./states"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { IconArrowRight, IconBranch, IconClock, IconFlag, IconNav } from "@/components/icons"
import { formatClock, formatWindow } from "@/lib/format"

/**
 * Screen 12 — boundary selection (spec REQ-005, US-095). Pickers offer the confirmed main-plan stops plus two
 * edge choices: "trip start" (split from the first stop) and "no reunion" (both groups keep going to the last
 * stop's end). Stop→stop keeps the original shape; both edge choices cannot be combined. The window card follows
 * the current picks immediately (a client preview only, never persisted); the single primary action saves a
 * changed selection first and then moves on, so stale boundaries never win and no separate save button exists.
 */
export function ScreenBoundary() {
  const { tripId = "" } = useParams()
  const roundIndex = useRoundIndex()
  const navigate = useSplitNavigate()
  const rounds = useSplitRounds(tripId)
  const draft = useSplitDraft(tripId, roundIndex)
  const save = useSaveBoundaries(tripId, roundIndex)
  const detail = draft.data
  const previousRound = rounds.data?.rounds.find((round) => round.roundIndex === roundIndex - 1) ?? null
  const previousReunionId = roundIndex > 1 ? previousRound?.reunionStopId ?? null : null

  const [departureStop, setDepartureStop] = useState<string | null>(null)
  const [reunionStop, setReunionStop] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  // Seed the selection once from the saved snapshot; polling must not clobber an unsaved choice. A legacy
  // FROM_START draft (the product no longer offers "分开就分开") seeds its first stop so the next save rewrites it
  // as a normal stop→stop boundary with the same departure instant.
  useEffect(() => {
    const canSeed = roundIndex === 1 || rounds.data != null
    if (detail && canSeed && !ready) {
      const savedFromStart = roundIndex === 1 && detail.splitMode === "FROM_START"
      setDepartureStop(roundIndex > 1
        ? (detail.departureStopId ?? previousReunionId)
        : (savedFromStart ? detail.mainPlanStops[0]?.id ?? null : detail.departureStopId))
      setReunionStop(detail.reunionStopId)
      setReady(true)
    }
  }, [detail, previousReunionId, ready, roundIndex, rounds.data])

  const stops = detail?.mainPlanStops ?? []
  const departureIndex = stops.findIndex((stop) => stop.id === departureStop)
  const reunionIndex = stops.findIndex((stop) => stop.id === reunionStop)
  const previousReunionIndex = previousReunionId
    ? stops.findIndex((stop) => stop.id === previousReunionId)
    : -1
  const departureChosen = departureStop != null
  const canSave = departureChosen && reunionStop != null && !save.isPending

  // Selection preview: the window card follows the current picks immediately (the backend still validates on save).
  const departureAt = departureIndex >= 0 ? stops[departureIndex].startAt : null
  const reunionAt = reunionIndex >= 0 ? stops[reunionIndex].startAt : null
  const previewWindow = departureAt != null && reunionAt != null
    ? Math.round((Date.parse(reunionAt) - Date.parse(departureAt)) / 60_000)
    : null

  const savedFromStart = roundIndex === 1 && detail?.splitMode === "FROM_START"
  const savedDepartureStop = roundIndex > 1
    ? (detail?.departureStopId ?? previousReunionId)
    : savedFromStart ? stops[0]?.id ?? null : (detail?.departureStopId ?? null)
  const dirty = detail != null && (
    departureStop !== savedDepartureStop
    || reunionStop !== (detail.reunionStopId ?? null)
  )

  function payload() {
    return {
      departureStopId: departureStop,
      reunionStopId: reunionStop,
      draftVersion: detail?.draftVersion ?? 0,
    }
  }

  // "下一步" saves the current pick first, so a changed shape can never be silently ignored in favour of
  // the previously saved boundaries.
  async function next() {
    if (!detail) return
    if (!dirty) {
      navigate(`/trips/${tripId}/split/rounds/${roundIndex}/routes`)
      return
    }
    if (!canSave) return
    try {
      await save.mutateAsync(payload())
      navigate(`/trips/${tripId}/split/rounds/${roundIndex}/routes`)
    } catch {
      // save.error renders below; stay on this screen.
    }
  }

  const action = (
    <Button className="flex-1" disabled={!canSave} onClick={next}>
      {save.isPending ? "保存中…" : dirty ? "保存并下一步" : "下一步"} <IconArrowRight />
    </Button>
  )

  return (
    <SplitLayout
      title={roundIndex > 1 ? `第 ${roundIndex} 次分队 · 边界` : "分头与会合边界"}
      subtitle={roundIndex > 1 ? "只能从上一轮会合站或之后分头" : "分头 / 会合 · 仅主线节点"}
      step={1}
      backTo={`/trips/${tripId}/split`}
      action={action}
    >
      {draft.isPending ? (
        <LoadingState label="加载主线节点…" />
      ) : draft.error ? (
        <ErrorState error={draft.error} onRetry={() => draft.refetch()} />
      ) : !detail ? (
        <EmptyState
          icon={<IconBranch />}
          title="尚未发起草稿"
          hint="请先发起分队草稿，再选择出发与会合边界。"
          action={
            <Button size="sm" onClick={() => navigate(`/trips/${tripId}/split`)}>
              去发起
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[11.5px] leading-relaxed text-ink-3">
            {roundIndex > 1
              ? `第 ${roundIndex - 1} 次会合后再次分头：分头站必须不早于上一轮会合站，允许选同一站（会合后立即再分头）。`
              : "分头必须选择一个主线站点（不再提供「一开始就分开」）；会合必须排在分头之后；窗口 = 会合站开始 − 分头时刻，由后端校验为正。"}
          </p>

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-ink">
              <IconNav className="text-a" /> 分头节点（出发）
            </div>
            <div className="flex flex-wrap gap-2">
              {stops.map((stop, index) => (
                <Chip
                  key={stop.id}
                  tone="a"
                  selected={departureStop === stop.id}
                  disabled={
                    (previousReunionIndex >= 0 && index < previousReunionIndex)
                    || (departureStop !== stop.id && reunionStop != null && index >= reunionIndex)
                  }
                  onClick={() => setDepartureStop(departureStop === stop.id ? null : stop.id)}
                >
                  {formatClock(stop.startAt, detail.destination)} · {stop.name}
                </Chip>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-ink">
              <IconFlag className="text-ok" /> 会合节点（截止）
            </div>
            <div className="flex flex-wrap gap-2">
              {stops.map((stop, index) => (
                <Chip
                  key={stop.id}
                  tone="b"
                  selected={reunionStop === stop.id}
                  disabled={
                    reunionStop !== stop.id
                    && departureStop != null && index <= departureIndex
                  }
                  onClick={() => setReunionStop(reunionStop === stop.id ? null : stop.id)}
                >
                  {formatClock(stop.startAt, detail.destination)} · {stop.name}
                </Chip>
              ))}
            </div>
          </Card>

          <WindowCard
            departureAt={departureAt}
            reunionAt={reunionAt}
            windowMinutes={previewWindow}
            destination={detail.destination}
          />

          {dirty && canSave && (
            <p className="text-[11px] leading-relaxed text-ink-3">
              边界已修改但尚未保存：点“保存并下一步”会先保存，之前生成的分队路线将作废，需要重新生成。
            </p>
          )}

          <p className="text-[11px] leading-relaxed text-ink-3">
            会合截止为硬性时间：两组须在会合节点开始时刻前集合。选好节点后窗口会立即更新；保存时由后端复算校验，前端不自行落库。
          </p>

          {save.error ? <ErrorState error={save.error} /> : null}
        </div>
      )}
    </SplitLayout>
  )
}

function WindowCard({
  departureAt,
  reunionAt,
  windowMinutes,
  destination,
}: {
  departureAt: string | null
  reunionAt: string | null
  windowMinutes: number | null
  destination?: string | null
}) {
  return (
    <Card className="border-brand-soft bg-gradient-to-br from-brand-soft/50 to-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-center">
          <div className="text-[10.5px] font-semibold tracking-wide text-ink-3 uppercase">分头</div>
          <div className="mt-0.5 text-[19px] font-extrabold text-ink">{formatClock(departureAt, destination)}</div>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10.5px] font-semibold text-brand-ink">分头行动</span>
          <span className="h-px w-full bg-gradient-to-r from-a via-brand to-b" />
        </div>
        <div className="text-center">
          <div className="text-[10.5px] font-semibold tracking-wide text-ink-3 uppercase">会合</div>
          <div className="mt-0.5 text-[19px] font-extrabold text-ink">{formatClock(reunionAt, destination)}</div>
        </div>
      </div>
      <div className="mt-3 flex justify-center">
        {windowMinutes != null && windowMinutes > 0 ? (
          <Badge variant="ok">
            <IconClock /> 窗口 {formatWindow(windowMinutes)}
          </Badge>
        ) : windowMinutes != null ? (
          <Badge variant="warn">会合需晚于分头</Badge>
        ) : (
          <Badge variant="neutral">选择分头与会合后显示窗口</Badge>
        )}
      </div>
    </Card>
  )
}