import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useCheckTiming, useSplitDraft } from "./hooks"
import { SplitLayout } from "./split-layout"
import { EmptyState, ErrorState, LoadingState } from "./states"
import type { CheckTimingRequest, GroupRoute, RouteTimingResult } from "./types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ValidItem, ValidList } from "@/components/ui/valid-item"
import { IconAlert, IconBranch, IconCheck, IconClock, IconFlag, IconNav, IconRoute, IconSparkle } from "@/components/icons"
import { formatClock } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Screen 14 — reunion timing check (spec REQ-007). The check consumes an explicit two-route snapshot
 * (POST routes:check-timing, read-only, zero DB). Inputs are pre-filled from the saved routes and stay
 * editable so the overrun (T2-N) and missing-input (T3-N) states are observable in the walkthrough;
 * clearing a field sends null. The client never declares feasibility — it renders the backend's
 * totalMinutes / overrunMinutes / missingInputs / feasible. Confirm (US-049) is out of scope.
 */
interface RouteInput {
  groupLabel: string
  activity: string
  legs: string[]
  buffer: string
}

export function ScreenTiming() {
  const { tripId = "" } = useParams()
  const navigate = useNavigate()
  const draft = useSplitDraft(tripId)
  const check = useCheckTiming(tripId)
  const detail = draft.data
  const result = check.data

  const [inputs, setInputs] = useState<RouteInput[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (detail && detail.routes.length === 2 && !ready) {
      setInputs(detail.routes.map(toInput))
      setReady(true)
    }
  }, [detail, ready])

  const windowMinutes = detail?.windowMinutes ?? null
  const hasPair = (detail?.routes.length ?? 0) === 2

  const updateInput = (index: number, patch: Partial<RouteInput>) =>
    setInputs((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  const updateLeg = (index: number, legIdx: number, value: string) =>
    setInputs((prev) => prev.map((it, i) => (i === index ? { ...it, legs: it.legs.map((l, j) => (j === legIdx ? value : l)) } : it)))

  const runCheck = () => {
    if (windowMinutes == null) return
    const body: CheckTimingRequest = {
      windowMinutes,
      routes: inputs.map((i) => ({
        groupLabel: i.groupLabel,
        activityMinutes: toNum(i.activity),
        travelLegsMinutes: i.legs.map(toNum),
        bufferMinutes: toNum(i.buffer),
      })),
    }
    check.mutate(body)
  }

  const action = (
    <Button className="flex-1" disabled={!hasPair || windowMinutes == null || check.isPending} onClick={runCheck}>
      {check.isPending ? "校验中…" : result ? "重新校验" : "校验时间窗"} <IconCheck />
    </Button>
  )

  return (
    <SplitLayout
      title="会合时间窗校验"
      subtitle="基于快照校验 · 只读不写库"
      step={3}
      backTo={`/trips/${tripId}/split/routes`}
      action={action}
    >
      {draft.isPending ? (
        <LoadingState label="加载路线快照…" />
      ) : draft.error ? (
        <ErrorState error={draft.error} onRetry={() => draft.refetch()} />
      ) : !detail ? (
        <EmptyState
          icon={<IconBranch />}
          title="尚未发起草稿"
          hint="请先发起草稿、保存边界并生成路线。"
          action={<Button size="sm" onClick={() => navigate(`/trips/${tripId}/split`)}>去发起</Button>}
        />
      ) : windowMinutes == null ? (
        <EmptyState
          icon={<IconClock />}
          title="尚未保存边界"
          hint="校验前需先保存出发与会合边界以确定时间窗。"
          action={<Button size="sm" onClick={() => navigate(`/trips/${tripId}/split/boundaries`)}>去选择边界</Button>}
        />
      ) : !hasPair ? (
        <EmptyState
          icon={<IconRoute />}
          title="尚未生成两条路线"
          hint="校验需恰好两条分组路线快照。"
          action={<Button size="sm" onClick={() => navigate(`/trips/${tripId}/split/routes`)}>去生成路线</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <Card className="border-brand-soft bg-gradient-to-br from-brand-soft/50 to-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[13px] font-bold text-ink">
                时间窗 {formatClock(detail.departureAt)} → {formatClock(detail.reunionAt)}
              </div>
              <Badge variant="brand">
                <IconClock /> 共 {windowMinutes} 分钟
              </Badge>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[10.5px] text-ink-2">
              <span className="flex items-center gap-1"><Legend swatch="solid" /> 活动</span>
              <span className="flex items-center gap-1"><Legend swatch="striped" /> 路程</span>
              <span className="flex items-center gap-1"><Legend swatch="light" /> 缓冲</span>
            </div>
          </Card>

          <div className="flex flex-col gap-2.5">
            {inputs.map((input, index) => (
              <InputCard
                key={input.groupLabel}
                input={input}
                tone={input.groupLabel === "B" ? "b" : "a"}
                onField={(patch) => updateInput(index, patch)}
                onLeg={(legIdx, value) => updateLeg(index, legIdx, value)}
              />
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-ink-3">
            输入预填自保存快照，可调整以观察超窗 / 缺输入态；清空某项即模拟缺输入。可行性由后端判定，前端不自行宣布。
          </p>

          {check.error ? <ErrorState error={check.error} /> : null}

          {result ? (
            <div className="flex flex-col gap-3">
              {result.routes.map((res) => {
                const input = inputs.find((i) => i.groupLabel === res.groupLabel)
                if (!input) return null
                return (
                  <TimingRoute
                    key={res.groupLabel}
                    result={res}
                    input={input}
                    tone={res.groupLabel === "B" ? "b" : "a"}
                    windowMinutes={result.windowMinutes}
                    reunionClock={formatClock(detail.reunionAt)}
                  />
                )
              })}
              <SummaryCard feasible={result.feasible} />
            </div>
          ) : null}

          <p className="text-[10.5px] leading-relaxed text-ink-3">确认分队（US-049）本期不实现；校验为只读快照、不写库。</p>
        </div>
      )}
    </SplitLayout>
  )
}

function InputCard({
  input,
  tone,
  onField,
  onLeg,
}: {
  input: RouteInput
  tone: "a" | "b"
  onField: (patch: Partial<RouteInput>) => void
  onLeg: (legIdx: number, value: string) => void
}) {
  return (
    <Card className="p-3">
      <div className={cn("mb-2 text-[12.5px] font-extrabold", tone === "a" ? "text-a" : "text-b")}>
        {input.groupLabel} 组 · 快照输入（分钟）
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="活动" value={input.activity} onChange={(v) => onField({ activity: v })} />
        {input.legs.map((leg, idx) => (
          <Field key={idx} label={`路程${idx + 1}`} value={leg} onChange={(v) => onLeg(idx, v)} />
        ))}
        <Field label="缓冲" value={input.buffer} onChange={(v) => onField({ buffer: v })} />
      </div>
    </Card>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold text-ink-3">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-16 rounded-control border border-line bg-surface px-2 py-1 text-[12px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
      />
    </label>
  )
}

function TimingRoute({
  result,
  input,
  tone,
  windowMinutes,
  reunionClock,
}: {
  result: RouteTimingResult
  input: RouteInput
  tone: "a" | "b"
  windowMinutes: number
  reunionClock: string
}) {
  const color = tone === "a" ? "#2563eb" : "#ea580c"
  const activity = toNum(input.activity)
  const legs = input.legs.map(toNum)
  const legsSum = legs.every((l) => l != null) ? legs.reduce((sum, l) => sum + (l ?? 0), 0) : null
  const buffer = toNum(input.buffer)
  const total = result.totalMinutes
  const missing = result.missingInputs.length > 0
  const overrun = result.overrunMinutes ?? 0
  const complete = activity != null && legsSum != null && buffer != null && total != null
  const denom = total != null ? Math.max(total, windowMinutes) : windowMinutes

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={cn("text-[13px] font-extrabold", tone === "a" ? "text-a" : "text-b")}>{result.groupLabel} 组</span>
        {missing ? (
          <Badge variant="warn"><IconAlert /> 缺输入</Badge>
        ) : overrun > 0 ? (
          <Badge variant="err"><IconAlert /> 超窗 {overrun} 分</Badge>
        ) : (
          <Badge variant="ok"><IconCheck /> {total} ≤ {windowMinutes}</Badge>
        )}
      </div>

      {complete ? (
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface-3">
          <div className="flex h-full w-full">
            <span style={{ width: `${((activity ?? 0) / denom) * 100}%`, backgroundColor: color }} />
            <span
              style={{
                width: `${((legsSum ?? 0) / denom) * 100}%`,
                backgroundColor: color,
                opacity: 0.55,
                backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,.5) 0 3px, transparent 3px 6px)",
              }}
            />
            <span style={{ width: `${((buffer ?? 0) / denom) * 100}%`, backgroundColor: color, opacity: 0.22 }} />
          </div>
          {overrun > 0 ? (
            <span className="absolute inset-y-0 w-[2px] bg-err" style={{ left: `${(windowMinutes / denom) * 100}%` }} />
          ) : null}
        </div>
      ) : (
        <div
          className="h-3 w-full rounded-full bg-surface-3"
          style={{ backgroundImage: "repeating-linear-gradient(45deg, #e9e7e2 0 4px, transparent 4px 8px)" }}
        />
      )}

      <div className="mt-2">
        <ValidList>
          <ValidItem tone={tone} icon={<IconSparkle />} title="活动" trailing={activity != null ? `${activity} 分` : "缺失"} />
          <ValidItem
            tone={tone}
            icon={<IconNav />}
            title={`路程（${input.legs.join(" + ")}）`}
            trailing={legsSum != null ? `${legsSum} 分` : "缺失"}
          />
          <ValidItem tone={tone} icon={<IconClock />} title="缓冲" trailing={buffer != null ? `${buffer} 分` : "缺失"} />
        </ValidList>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-line-2 pt-2">
        <span className="text-[12px] font-bold text-ink">合计 {total != null ? `${total} 分` : "—"}</span>
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#047857]">
          <IconFlag className="size-3.5" /> 会合截止 {reunionClock}
        </span>
      </div>

      {missing ? <p className="mt-1 text-[11px] text-warn">缺失项：{result.missingInputs.join("、")}</p> : null}
    </Card>
  )
}

function SummaryCard({ feasible }: { feasible: boolean }) {
  return feasible ? (
    <Card className="flex items-start gap-2.5 border-[#a7f3d0] bg-ok-soft p-3.5">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ok/15 text-ok [&_svg]:size-4"><IconCheck /></span>
      <div className="min-w-0">
        <div className="text-[13px] font-bold text-[#047857]">校验通过：两条路线均可行</div>
        <p className="mt-0.5 text-[11.5px] text-ink-2">基于快照、只读不写库；可行性由后端判定。</p>
      </div>
    </Card>
  ) : (
    <Card className="flex items-start gap-2.5 border-[#fde68a] bg-warn-soft p-3.5">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-warn/15 text-warn [&_svg]:size-4"><IconAlert /></span>
      <div className="min-w-0">
        <div className="text-[13px] font-bold text-[#b45309]">校验未通过：整对不可确认</div>
        <p className="mt-0.5 text-[11.5px] text-ink-2">存在超窗或缺输入路线；整对 feasible=false（判定归后端）。</p>
      </div>
    </Card>
  )
}

function Legend({ swatch }: { swatch: "solid" | "striped" | "light" }) {
  const style =
    swatch === "solid"
      ? { backgroundColor: "#0d9488" }
      : swatch === "striped"
        ? {
            backgroundColor: "#0d9488",
            opacity: 0.55,
            backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,.5) 0 3px, transparent 3px 6px)",
          }
        : { backgroundColor: "#0d9488", opacity: 0.22 }
  return <span className="inline-block size-3 rounded-[3px]" style={style} />
}

function toInput(route: GroupRoute): RouteInput {
  return {
    groupLabel: route.groupLabel,
    activity: String(route.activityMinutes),
    legs: route.travelLegsMinutes.map(String),
    buffer: String(route.bufferMinutes),
  }
}

function toNum(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}