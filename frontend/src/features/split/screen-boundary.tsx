import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { useSplitNavigate } from "./split-navigation"
import { useSaveBoundaries, useSplitDraft } from "./hooks"
import { SplitLayout } from "./split-layout"
import { EmptyState, ErrorState, LoadingState } from "./states"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { IconAlert, IconArrowRight, IconBranch, IconClock, IconFlag, IconNav } from "@/components/icons"
import { formatClock, formatWindow } from "@/lib/format"

/**
 * Screen 12 — boundary selection (spec US-090 第 4 段). Pickers offer only the confirmed main-plan stops, in main
 * order: a reunion stop never precedes the departure stop, so the chips that would break the order are disabled
 * (and aria-disabled) instead of being silently rejected later. The window card previews the picked pair
 * immediately; the preview is display-only and the saved value still comes from the backend. A single "下一步"
 * persists a changed pair first and then moves on, so a changed selection can never be silently dropped.
 */
export function ScreenBoundary() {
  const { tripId = "" } = useParams()
  const navigate = useSplitNavigate()
  const draft = useSplitDraft(tripId)
  const save = useSaveBoundaries(tripId)
  const detail = draft.data

  const [departure, setDeparture] = useState<string | null>(null)
  const [reunion, setReunion] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  // Seed the selection once from the saved snapshot; polling must not clobber an unsaved choice.
  useEffect(() => {
    if (detail && !ready) {
      setDeparture(detail.departureStopId)
      setReunion(detail.reunionStopId)
      setReady(true)
    }
  }, [detail, ready])

  const stops = detail?.mainPlanStops ?? []
  const departureIndex = stops.findIndex((stop) => stop.id === departure)
  const reunionIndex = stops.findIndex((stop) => stop.id === reunion)
  const departureStop = departureIndex >= 0 ? stops[departureIndex] : null
  const reunionStop = reunionIndex >= 0 ? stops[reunionIndex] : null
  // Both picks must still resolve to a main-line stop in the right order; a boundary stop removed from the plan
  // leaves a stale id, which must block "下一步" instead of bouncing to the route page.
  const picked = departureIndex >= 0 && reunionIndex > departureIndex
  const danglingBoundary =
    (departure != null && departureIndex < 0) || (reunion != null && reunionIndex < 0)
  const dirty = detail != null && (departure !== detail.departureStopId || reunion !== detail.reunionStopId)
  const canProceed = picked && !save.isPending

  // "下一步" saves a changed pair first, so a changed selection can never be ignored in favour of the old one.
  async function next() {
    if (!detail || departure == null || reunion == null) return
    if (!dirty) {
      navigate(`/trips/${tripId}/split/routes`)
      return
    }
    try {
      await save.mutateAsync({ departureStopId: departure, reunionStopId: reunion, draftVersion: detail.draftVersion })
      navigate(`/trips/${tripId}/split/routes`)
    } catch {
      // save.error renders below; stay on this screen with the picked values intact.
    }
  }

  const action = (
    <Button className="flex-1" disabled={!canProceed} onClick={next}>
      {save.isPending ? "保存中…" : "下一步"} <IconArrowRight />
    </Button>
  )

  return (
    <SplitLayout
      title="分头与会合边界"
      subtitle="出发 / 会合 · 仅主线节点"
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
            出发时刻取所选站点的开始时间（即在该站开始分头），会合时刻取所选站点的开始时间。会合站必须排在出发站之后；
            窗口 = 会合开始 − 出发开始，合法性以服务端校验为准。
          </p>

          {danglingBoundary ? (
            <Card className="flex items-start gap-2.5 border-[#fde68a] bg-warn-soft p-3.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-warn/15 text-warn [&_svg]:size-4">
                <IconAlert />
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-[#b45309]">原边界站已从主线删除</div>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-2">
                  原来的出发或会合站已不在主线方案里，请重新选择边界后再点「下一步」。
                </p>
              </div>
            </Card>
          ) : null}

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-ink">
              <IconNav className="text-a" /> 分头节点（出发）
            </div>
            <div className="flex flex-wrap gap-2">
              {stops.map((stop, index) => {
                const blocked = departure !== stop.id && reunionIndex >= 0 && index >= reunionIndex
                return (
                  <Chip
                    key={stop.id}
                    tone="a"
                    selected={departure === stop.id}
                    disabled={blocked}
                    aria-disabled={blocked || undefined}
                    onClick={() => setDeparture(departure === stop.id ? null : stop.id)}
                  >
                    {formatClock(stop.startAt, detail.destination)} · {stop.name}
                  </Chip>
                )
              })}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-ink">
              <IconFlag className="text-ok" /> 会合节点（截止）
            </div>
            <div className="flex flex-wrap gap-2">
              {stops.map((stop, index) => {
                const blocked = reunion !== stop.id && departureIndex >= 0 && index <= departureIndex
                return (
                  <Chip
                    key={stop.id}
                    tone="b"
                    selected={reunion === stop.id}
                    disabled={blocked}
                    aria-disabled={blocked || undefined}
                    onClick={() => setReunion(reunion === stop.id ? null : stop.id)}
                  >
                    {formatClock(stop.startAt, detail.destination)} · {stop.name}
                  </Chip>
                )
              })}
            </div>
          </Card>

          <WindowCard
            departureAt={departureStop?.startAt ?? null}
            reunionAt={reunionStop?.startAt ?? null}
            savedWindowMinutes={detail.windowMinutes}
            destination={detail.destination}
          />

          {dirty && picked ? (
            <p className="text-[11px] leading-relaxed text-ink-3">
              边界已修改但尚未保存：点击「下一步」会先保存，之前生成的分队路线将作废，需要重新生成。
            </p>
          ) : null}

          <p className="text-[11px] leading-relaxed text-ink-3">
            上方时长为前端即时预览；落库、窗口为正与超窗判定都以服务端结果为准，保存失败会停留在本页并保留已选值。
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
  savedWindowMinutes,
  destination,
}: {
  departureAt: string | null
  reunionAt: string | null
  savedWindowMinutes: number | null
  destination?: string | null
}) {
  const previewMinutes = windowMinutes(departureAt, reunionAt)
  const both = departureAt != null && reunionAt != null
  return (
    <Card className="border-brand-soft bg-gradient-to-br from-brand-soft/50 to-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-center">
          <div className="text-[10.5px] font-semibold tracking-wide text-ink-3 uppercase">出发</div>
          <div className="mt-0.5 text-[19px] font-extrabold text-ink">
            {departureAt != null ? formatClock(departureAt, destination) : "待选择"}
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10.5px] font-semibold text-brand-ink">分头行动</span>
          <span className="h-px w-full bg-gradient-to-r from-a via-brand to-b" />
        </div>
        <div className="text-center">
          <div className="text-[10.5px] font-semibold tracking-wide text-ink-3 uppercase">会合</div>
          <div className="mt-0.5 text-[19px] font-extrabold text-ink">
            {reunionAt != null ? formatClock(reunionAt, destination) : "待选择"}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-col items-center gap-1">
        {previewMinutes != null ? (
          <Badge variant="ok">
            <IconClock /> 窗口 {formatWindow(previewMinutes)}
          </Badge>
        ) : (
          <Badge variant="neutral">
            {both ? "区间无效：会合须晚于出发" : "选择出发与会合后显示时间窗"}
          </Badge>
        )}
        {savedWindowMinutes != null ? (
          <span className="text-[10.5px] text-ink-3">已保存窗口 {formatWindow(savedWindowMinutes)}</span>
        ) : null}
      </div>
    </Card>
  )
}

/** Preview only: elapsed minutes between two ISO instants; null unless the pair is a usable positive window. */
function windowMinutes(departureAt: string | null, reunionAt: string | null): number | null {
  if (departureAt == null || reunionAt == null) return null
  const start = Date.parse(departureAt)
  const end = Date.parse(reunionAt)
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  const minutes = Math.round((end - start) / 60_000)
  return minutes > 0 ? minutes : null
}
