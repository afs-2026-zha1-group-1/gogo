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
import { IconArrowRight, IconBranch, IconClock, IconFlag, IconNav } from "@/components/icons"
import { formatClock, formatWindow } from "@/lib/format"

/**
 * Screen 12 — boundary selection (spec REQ-005). Pickers offer only the confirmed main-plan stops
 * returned by the snapshot; departure shows each stop's scheduled end, reunion its scheduled start.
 * The window card reflects the backend-saved departure/reunion/window (never a client computation).
 * Save wires PUT boundaries; non-positive window / out-of-main / non-initiator / stale rejections
 * surface from the backend. Next is enabled only once a window has actually been saved.
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
  const canSave = departure != null && reunion != null && !save.isPending
  const saved = detail?.windowMinutes != null

  const action = (
    <>
      <Button
        variant="outline"
        className="flex-1"
        disabled={!canSave}
        onClick={() =>
          detail && save.mutate({ departureStopId: departure, reunionStopId: reunion, draftVersion: detail.draftVersion })
        }
      >
        {save.isPending ? "保存中…" : "保存边界"}
      </Button>
      <Button className="flex-1" disabled={!saved} onClick={() => navigate(`/trips/${tripId}/split/routes`)}>
        下一步 <IconArrowRight />
      </Button>
    </>
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
            出发时刻取所选节点的结束时间，会合时刻取所选节点的开始时间；窗口由后端派生并校验为正。
          </p>

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-ink">
              <IconNav className="text-a" /> 分头节点（出发）
            </div>
            <div className="flex flex-wrap gap-2">
              {stops.map((stop) => (
                <Chip key={stop.id} tone="a" selected={departure === stop.id} onClick={() => setDeparture(stop.id)}>
                  {formatClock(stop.endAt)} · {stop.name}
                </Chip>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-ink">
              <IconFlag className="text-ok" /> 会合节点（截止）
            </div>
            <div className="flex flex-wrap gap-2">
              {stops.map((stop) => (
                <Chip key={stop.id} tone="b" selected={reunion === stop.id} onClick={() => setReunion(stop.id)}>
                  {formatClock(stop.startAt)} · {stop.name}
                </Chip>
              ))}
            </div>
          </Card>

          <WindowCard
            departureAt={detail.departureAt}
            reunionAt={detail.reunionAt}
            windowMinutes={detail.windowMinutes}
          />

          <p className="text-[11px] leading-relaxed text-ink-3">
            会合截止为硬性时间：两组须在会合节点开始时刻前集合。窗口合法性由后端判定，前端不自行落库。
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
}: {
  departureAt: string | null
  reunionAt: string | null
  windowMinutes: number | null
}) {
  return (
    <Card className="border-brand-soft bg-gradient-to-br from-brand-soft/50 to-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-center">
          <div className="text-[10.5px] font-semibold tracking-wide text-ink-3 uppercase">出发</div>
          <div className="mt-0.5 text-[19px] font-extrabold text-ink">{formatClock(departureAt)}</div>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10.5px] font-semibold text-brand-ink">分头行动</span>
          <span className="h-px w-full bg-gradient-to-r from-a via-brand to-b" />
        </div>
        <div className="text-center">
          <div className="text-[10.5px] font-semibold tracking-wide text-ink-3 uppercase">会合</div>
          <div className="mt-0.5 text-[19px] font-extrabold text-ink">{formatClock(reunionAt)}</div>
        </div>
      </div>
      <div className="mt-3 flex justify-center">
        {windowMinutes != null ? (
          <Badge variant="ok">
            <IconClock /> 窗口 {formatWindow(windowMinutes)}
          </Badge>
        ) : (
          <Badge variant="neutral">保存后显示时间窗</Badge>
        )}
      </div>
    </Card>
  )
}