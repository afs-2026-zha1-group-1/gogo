import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useParams } from "react-router-dom"
import { useSplitNavigate } from "./split-navigation"
import { SplitApiError } from "./api"
import {
  useAssignGroup,
  useCheckTiming,
  useGenerateRoutes,
  useSaveRoutes,
  useSplitDraft,
  useTripMembers,
} from "./hooks"
import { useAuth } from "../auth/AuthProvider"
import { SplitLayout } from "./split-layout"
import { EmptyState, ErrorState, LoadingState } from "./states"
import { RouteCard } from "./route-card"
import { travelLabel } from "./graph-model"
import type { GroupRoute, RouteEditInput, TimingResult } from "./types"
import type { TripMember } from "../../types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { IconAlert, IconArrowRight, IconBranch, IconFlag, IconNav, IconRoute, IconSparkle, IconUsers } from "@/components/icons"
import { formatClock, shortId } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Screen 13 — group routes and inline route editing (spec US-040 + US-042 + US-087 + US-088). Group chips move a
 * member between A/B (any trip member, user ruling 2026-11-17). While the draft is active the A/B route cards become
 * editable: group A exposes read-only stop names with editable stay/travel minutes, group B exposes the single
 * activity breakdown plus an optional location. Next saves dirty edits first, then asks the backend to check the
 * reunion window; feasible=false keeps the user here behind a blocking dialog, while feasible=true moves on to the
 * read-only team-route preview (Screen 13b). The client never declares feasibility itself.
 */
interface RouteForm {
  groupLabel: string
  activityName: string
  locationName: string
  steps: { name: string; minutes: string }[]
  activityMinutes: string
  travelLegsMinutes: string[]
  bufferMinutes: string
}

function toForm(route: GroupRoute): RouteForm {
  const steps = route.steps ?? []
  return {
    groupLabel: route.groupLabel,
    activityName: route.activityName ?? "",
    locationName: route.locationName ?? "",
    steps: steps.map((step) => ({ name: step.name, minutes: String(step.minutes) })),
    activityMinutes: route.activityMinutes != null ? String(route.activityMinutes) : "",
    travelLegsMinutes: (route.travelLegsMinutes ?? []).map((minutes) => (minutes != null ? String(minutes) : "")),
    bufferMinutes: route.bufferMinutes != null ? String(route.bufferMinutes) : "",
  }
}

function toNum(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function toApiRoute(form: RouteForm): RouteEditInput {
  if (form.steps.length > 0) {
    return {
      groupLabel: "A",
      activityName: form.activityName.trim(),
      locationName: form.locationName.trim() || null,
      stepMinutes: form.steps.map((step) => toNum(step.minutes)),
      travelLegsMinutes: form.travelLegsMinutes.map(toNum),
    }
  }
  return {
    groupLabel: form.groupLabel === "B" ? "B" : "A",
    activityName: form.activityName.trim(),
    locationName: form.locationName.trim() || null,
    activityMinutes: toNum(form.activityMinutes),
    travelLegsMinutes: form.travelLegsMinutes.map(toNum),
    bufferMinutes: toNum(form.bufferMinutes),
  }
}

function formTotal(form: RouteForm): number | null {
  const legs = form.travelLegsMinutes.map(toNum)
  if (legs.some((minutes) => minutes == null)) return null
  const legsTotal = legs.reduce<number>((sum, minutes) => sum + (minutes ?? 0), 0)
  if (form.steps.length > 0) {
    const stays = form.steps.map((step) => toNum(step.minutes))
    if (stays.some((minutes) => minutes == null)) return null
    return stays.reduce<number>((sum, minutes) => sum + (minutes ?? 0), 0) + legsTotal
  }
  const activity = toNum(form.activityMinutes)
  const buffer = toNum(form.bufferMinutes)
  if (activity == null || buffer == null) return null
  return activity + legsTotal + buffer
}

export function ScreenRoutes() {
  const { tripId = "" } = useParams()
  const navigate = useSplitNavigate()
  const { search } = useLocation()
  const dashboardOrigin = new URLSearchParams(search).get("from") === "dashboard"
  const draft = useSplitDraft(tripId)
  const generate = useGenerateRoutes(tripId)
  const assign = useAssignGroup(tripId)
  const save = useSaveRoutes(tripId)
  const check = useCheckTiming(tripId)
  const membersQuery = useTripMembers(tripId)
  const { accountId } = useAuth()
  const [notice, setNotice] = useState<string | null>(null)
  const [form, setForm] = useState<RouteForm[]>([])
  const [formVersion, setFormVersion] = useState<number | null>(null)
  const [dialog, setDialog] = useState<TimingResult | null>(null)
  const [actionError, setActionError] = useState<unknown>(null)
  const initializedVersion = useRef<number | null>(null)
  const detail = draft.data
  const myId = accountId == null ? null : String(accountId)
  const tooFewMembers = membersQuery.data != null && membersQuery.data.length < 2

  const stopNames = new Map((detail?.mainPlanStops ?? []).map((stop) => [stop.id, stop.name]))
  const nameOf = (id: string | null) => (id ? (stopNames.get(id) ?? "未知节点") : "—")
  const routes = detail?.routes ?? []
  const hasPair = routes.length === 2
  const boundariesSaved = detail?.windowMinutes != null
  // Generation and confirmation both require a complete partition (design DD8/DD9/DD10); disable the
  // CTAs instead of letting the user hit a 409 SPLIT_DRAFT_INCOMPLETE.
  const groupsComplete =
    (detail?.groups.A?.length ?? 0) > 0 && (detail?.groups.B?.length ?? 0) > 0
  // A confirmed/cancelled draft is locked server-side (SPLIT_DRAFT_NOT_ACTIVE); mirror that in the CTAs.
  const draftActive = detail?.status === "active"
  const editable = draftActive && hasPair
  const pending = save.isPending || check.isPending

  useEffect(() => {
    if (!detail || detail.routes.length !== 2) return
    if (initializedVersion.current === detail.draftVersion) return
    initializedVersion.current = detail.draftVersion
    setForm(detail.routes.map(toForm))
    setFormVersion(detail.draftVersion)
  }, [detail])

  const baseline = useMemo(() => (hasPair ? routes.map(toForm) : []), [routes, hasPair])
  const dirty = editable && form.length === 2 && JSON.stringify(form) !== JSON.stringify(baseline)

  const patchRoute = (index: number, patch: Partial<RouteForm>) =>
    setForm((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)))

  const onNext = async () => {
    if (!detail || !hasPair || detail.windowMinutes == null) return
    setDialog(null)
    setActionError(null)
    try {
      let snapshot = detail.routes
      if (dirty) {
        const saved = await save.mutateAsync({
          draftVersion: detail.draftVersion,
          routes: form.map(toApiRoute),
        })
        snapshot = saved.routes
      }
      const timing = await check.mutateAsync({
        windowMinutes: detail.windowMinutes,
        routes: snapshot.map((route) => ({
          groupLabel: route.groupLabel,
          activityMinutes: route.activityMinutes,
          travelLegsMinutes: route.travelLegsMinutes,
          bufferMinutes: route.bufferMinutes,
        })),
      })
      if (timing.feasible) {
        navigate(`/trips/${tripId}/split/preview`)
      } else {
        setDialog(timing)
      }
    } catch (error) {
      if (error instanceof SplitApiError && error.code === "STALE_DRAFT_VERSION") {
        void draft.refetch()
      }
      setActionError(error)
    }
  }

  const action = tooFewMembers || !draftActive ? null : (
    <>
      <Button
        variant="outline"
        className="flex-1"
        disabled={!boundariesSaved || !groupsComplete || !draftActive || generate.isPending || pending}
        onClick={() => detail && generate.mutate({ draftVersion: detail.draftVersion })}
      >
        {generate.isPending ? "生成中…" : hasPair ? "重新生成" : "生成两条路线"} <IconSparkle />
      </Button>
      <Button
        className="flex-1"
        disabled={!hasPair || !groupsComplete || !draftActive || pending}
        onClick={onNext}
      >
        {pending ? "校验中…" : "下一步"} <IconArrowRight />
      </Button>
    </>
  )

  return (
    <SplitLayout
      title="分组与路线"
      subtitle="可调整路线 · 下一步校验时间窗"
      step={2}
      backTo={`/trips/${tripId}/split/boundaries`}
      action={action}
    >
      {draft.isPending ? (
        <LoadingState label="加载分组与路线…" />
      ) : draft.error ? (
        <ErrorState error={draft.error} onRetry={() => draft.refetch()} />
      ) : tooFewMembers ? (
        <EmptyState
          icon={<IconUsers />}
          title="无法分队：成员不足"
          hint={`当前行程只有 ${membersQuery.data?.length ?? 0} 名成员。分队需要 A/B 两组各至少一人，至少两名成员才能继续。`}
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                window.location.href = dashboardOrigin
                  ? `/#/dashboard/trips/${tripId}`
                  : `/#/trips/${tripId}`
              }}
            >
              返回行程详情
            </Button>
          }
        />
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
          <GroupCard
            groups={detail.groups}
            members={membersQuery.data}
            myId={myId}
            assignable={detail.status === "active"}
            hasRoutes={hasPair}
            assigning={assign.isPending}
            notice={notice}
            onAssign={(memberId, label) => {
              setNotice(null)
              assign.mutate(
                { memberId, groupLabel: label, draftVersion: detail.draftVersion },
                { onSuccess: () => setNotice(hasPair ? "分组已更新，路线仍为上次生成的版本，可点击重新生成。" : "分组已更新。") },
              )
            }}
          />

          {detail.windowMinutes != null && (
            <p className="text-[11.5px] leading-relaxed text-ink-3">
              时间窗 {formatClock(detail.departureAt, detail.destination)} → {formatClock(detail.reunionAt, detail.destination)}
              （共 {detail.windowMinutes} 分钟），由你在上一步选的出发/会合站决定；两条路线的合计都需不超过它。
            </p>
          )}

          {hasPair ? (
            <div className="flex flex-col gap-3">
              {routes.map((route, index) => (
                editable && formVersion === detail.draftVersion ? (
                  <EditableRouteCard
                    key={route.groupLabel}
                    form={form[index] ?? toForm(route)}
                    tone={route.groupLabel === "B" ? "b" : "a"}
                    editable={editable && !pending}
                    departureName={nameOf(route.departureStopId)}
                    reunionName={nameOf(route.reunionStopId)}
                    reunionClock={formatClock(detail.reunionAt, detail.destination)}
                    windowMinutes={detail.windowMinutes}
                    onChange={(patch) => patchRoute(index, patch)}
                    onStepChange={(stepIndex, minutes) =>
                      patchRoute(index, {
                        steps: (form[index]?.steps ?? []).map((step, itemIndex) =>
                          itemIndex === stepIndex ? { ...step, minutes } : step,
                        ),
                      })
                    }
                    onLegChange={(legIndex, minutes) =>
                      patchRoute(index, {
                        travelLegsMinutes: (form[index]?.travelLegsMinutes ?? []).map((value, itemIndex) =>
                          itemIndex === legIndex ? minutes : value,
                        ),
                      })
                    }
                  />
                ) : (
                  <RouteCard
                    key={route.groupLabel}
                    route={route}
                    tone={route.groupLabel === "B" ? "b" : "a"}
                    departureName={nameOf(route.departureStopId)}
                    reunionName={nameOf(route.reunionStopId)}
                    reunionClock={formatClock(detail.reunionAt, detail.destination)}
                    stale={(detail.groups[route.groupLabel] ?? []).length === 0}
                    windowMinutes={detail.windowMinutes}
                  />
                )
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
          {assign.error ? <ErrorState error={assign.error} /> : null}
          {actionError ? <ErrorState error={actionError} /> : null}
        </div>
      )}

      <Dialog
        open={dialog != null}
        title="时间窗校验未通过"
        onClose={() => setDialog(null)}
        footer={
          <Button className="w-full" onClick={() => setDialog(null)}>
            关闭
          </Button>
        }
      >
        {dialog ? (
          <div className="flex flex-col gap-2.5">
            <p className="text-ink-2">
              路线合计超过时间窗或存在缺失输入，整对不可继续。请修正后再点「下一步」。
            </p>
            {dialog.routes.map((route) => (
              <div key={route.groupLabel} className="rounded-card border border-line-2 bg-surface-2 px-3 py-2">
                <div className="flex items-center justify-between gap-2 text-[12.5px] font-bold text-ink">
                  <span>{route.groupLabel} 组</span>
                  <span className={route.overrunMinutes && route.overrunMinutes > 0 ? "text-[#b91c1c]" : "text-ink-2"}>
                    合计 {route.totalMinutes ?? "—"} 分 / 窗口 {dialog.windowMinutes} 分
                  </span>
                </div>
                {route.overrunMinutes != null && route.overrunMinutes > 0 ? (
                  <p className="mt-1 text-[11.5px] font-semibold text-[#b91c1c]">超窗 {route.overrunMinutes} 分</p>
                ) : null}
                {route.missingInputs.length > 0 ? (
                  <p className="mt-1 text-[11.5px] text-[#b45309]">缺失：{route.missingInputs.join("、")}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </Dialog>
    </SplitLayout>
  )
}

function EditableRouteCard({
  form,
  tone,
  editable,
  departureName,
  reunionName,
  reunionClock,
  windowMinutes,
  onChange,
  onStepChange,
  onLegChange,
}: {
  form: RouteForm
  tone: "a" | "b"
  editable: boolean
  departureName: string
  reunionName: string
  reunionClock: string
  windowMinutes: number | null
  onChange: (patch: Partial<RouteForm>) => void
  onStepChange: (stepIndex: number, minutes: string) => void
  onLegChange: (legIndex: number, minutes: string) => void
}) {
  const head = tone === "a" ? "from-a to-[#1e40af]" : "from-b to-[#9a3412]"
  const total = formTotal(form)
  const overrun = total != null && windowMinutes != null ? Math.max(0, total - windowMinutes) : null
  const inputClass =
    "w-full rounded-control border border-line bg-surface px-2 py-1.5 text-[12px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:bg-surface-3 disabled:text-ink-3"
  const numberClass =
    "w-14 rounded-control border border-line bg-surface px-2 py-1 text-[12px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:bg-surface-3 disabled:text-ink-3"

  return (
    <Card className="overflow-hidden">
      <div className={cn("flex items-center gap-3 bg-gradient-to-r px-4 py-3 text-white", head)}>
        <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-white/25 text-sm font-extrabold">
          {form.groupLabel}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold">{form.activityName || "未命名活动"}</div>
          <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-white/85">
            <IconNav className="size-3" /> {departureName} → {reunionName}
          </div>
        </div>
        {overrun != null ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold",
              overrun > 0 ? "bg-white text-[#b91c1c]" : "bg-white/20 text-white",
            )}
          >
            {overrun > 0 ? `超窗 ${overrun} 分` : `合计 ${total} 分`}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2.5 px-4 py-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-ink-3">活动名称</span>
          <input
            aria-label={`${form.groupLabel} 组 活动名称`}
            className={inputClass}
            value={form.activityName}
            disabled={!editable}
            onChange={(event) => onChange({ activityName: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-ink-3">地点（可选）</span>
          <input
            aria-label={`${form.groupLabel} 组 地点`}
            className={inputClass}
            placeholder="例如：滨海湾"
            value={form.locationName}
            disabled={!editable}
            onChange={(event) => onChange({ locationName: event.target.value })}
          />
        </label>

        {form.steps.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-ink-3">沿主线站点（站名只读，分钟可改）</span>
            {form.steps.map((step, index) => (
              <div key={`${step.name}-${index}`} className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-[12px] text-ink-2">{step.name}</span>
                <input
                  aria-label={`${form.groupLabel} 组 第 ${index + 1} 站停留分钟`}
                  type="number"
                  min={0}
                  className={numberClass}
                  value={step.minutes}
                  disabled={!editable}
                  onChange={(event) => onStepChange(index, event.target.value)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] text-ink-2">活动</span>
            <input
              aria-label={`${form.groupLabel} 组 活动分钟`}
              type="number"
              min={0}
              className={numberClass}
              value={form.activityMinutes}
              disabled={!editable}
              onChange={(event) => onChange({ activityMinutes: event.target.value })}
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold text-ink-3">路程（分钟）</span>
          {form.travelLegsMinutes.map((minutes, index) => {
            const label = travelLabel(form.travelLegsMinutes.length, index)
            return (
              <div key={`${form.groupLabel}-leg-${index}`} className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-ink-2">{label}</span>
                <input
                  aria-label={`${form.groupLabel} 组 ${label}`}
                  type="number"
                  min={0}
                  className={numberClass}
                  value={minutes}
                  disabled={!editable}
                  onChange={(event) => onLegChange(index, event.target.value)}
                />
              </div>
            )
          })}
        </div>

        {form.steps.length === 0 ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] text-ink-2">缓冲</span>
            <input
              aria-label={`${form.groupLabel} 组 缓冲分钟`}
              type="number"
              min={0}
              className={numberClass}
              value={form.bufferMinutes}
              disabled={!editable}
              onChange={(event) => onChange({ bufferMinutes: event.target.value })}
            />
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 border-t border-line-2 pt-2 text-[12px]">
          <span className="font-bold text-ink">合计 {total != null ? `${total} 分` : "—"}</span>
          <span className="text-ink-3">{windowMinutes != null ? `窗口 ${windowMinutes} 分` : "窗口未知"}</span>
        </div>
        {!editable ? (
          <p className="flex items-center gap-1 text-[11px] text-ink-3">
            <IconAlert className="size-3.5" /> 当前草稿不可编辑，仅可查看。
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2 border-t border-line-2 bg-ok-soft px-4 py-2.5 text-[12px] font-semibold text-[#047857]">
        <IconFlag className="size-3.5" /> {reunionClock} {reunionName}会合
      </div>
    </Card>
  )
}

/**
 * Group cards (US-040 DD13/DD14 + revision 2026-11-17), styled after the prototype Screen 13 `.route` block:
 * a colored A/B header (code badge + group name + headcount) above a chips body. Clicking a member chip moves that
 * member into the other group (any trip member may adjust the split). The stale-route marker lives on the route
 * cards, never inside an empty group.
 */
function GroupCard({
  groups,
  members,
  myId,
  assignable,
  hasRoutes,
  assigning,
  notice,
  onAssign,
}: {
  groups: Record<string, string[]>
  members: TripMember[] | undefined
  myId: string | null
  assignable: boolean
  hasRoutes: boolean
  assigning: boolean
  notice: string | null
  onAssign: (memberId: string, label: "A" | "B") => void
}) {
  const nameOf = (id: string) =>
    members?.find((member) => String(member.userId) === id)?.displayName ?? shortId(id)
  const initialOf = (id: string) => nameOf(id).slice(0, 1).toUpperCase()
  const emptyGroups = Object.entries(groups)
    .filter(([, ids]) => ids.length === 0)
    .map(([label]) => `${label} 组`)

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-ink">
        <IconUsers className="text-brand" /> 分组
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {Object.entries(groups).map(([label, ids]) => {
          const isA = label === "A"
          const head = isA ? "from-a to-[#1e40af]" : label === "B" ? "from-b to-[#9a3412]" : "from-ink-3 to-ink-3"
          const border = isA ? "border-a-line" : label === "B" ? "border-b-line" : "border-line"
          const chipOn = isA ? "border-a bg-a" : label === "B" ? "border-b bg-b" : "border-ink bg-ink"
          const target: "A" | "B" = label === "B" ? "A" : "B"
          return (
            <div
              key={label}
              className={cn(
                "overflow-hidden rounded-card border bg-surface shadow-[0_1px_3px_rgba(28,25,23,0.06)]",
                border,
              )}
            >
              <div className={cn("flex items-center gap-2 bg-gradient-to-br px-3 py-2.5 text-white", head)}>
                <span className="grid size-6 shrink-0 place-items-center rounded-[7px] bg-white/25 text-[12px] font-extrabold">
                  {label}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{label} 组</span>
                <span className="shrink-0 text-[11px] font-medium text-white/85">{ids.length} 人</span>
              </div>
              <div className="flex min-h-[58px] flex-wrap content-start gap-2 p-3">
                {ids.length === 0 ? (
                  <span className="text-[11.5px] leading-relaxed text-ink-3">暂无成员</span>
                ) : (
                  ids.map((id) => {
                    const isMe = id === myId
                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={!assignable || assigning}
                        onClick={() => onAssign(id, target)}
                        title={assignable ? `点击移到 ${target} 组` : undefined}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-semibold text-white transition",
                          chipOn,
                          assignable && "hover:brightness-105 active:scale-[0.98]",
                          !assignable && "cursor-default opacity-90",
                        )}
                      >
                        <span className="grid size-[18px] shrink-0 place-items-center rounded-full bg-white/25 text-[10px] font-bold">
                          {initialOf(id)}
                        </span>
                        <span className="max-w-[64px] truncate">{nameOf(id)}</span>
                        {isMe ? <span className="text-[9.5px] font-bold text-white/85">我</span> : null}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
      {assignable ? (
        <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
          点击成员头像可把他移到另一组；所有行程成员都可以调整分组。
        </p>
      ) : null}
      {emptyGroups.length > 0 ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">
          {emptyGroups.join("、")}暂无成员：两组都有成员后才能生成路线与确认，点上方成员头像可换组。
        </p>
      ) : null}
      {notice ? <p className="mt-1.5 text-[11px] font-semibold text-ok">{notice}</p> : null}
      {hasRoutes ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">
          {assignable
            ? "路线为上次生成的版本，可点击「重新生成」按当前分组重做。"
            : "草稿已结束，以下为最终确认的路线与分组。"}
        </p>
      ) : null}
    </div>
  )
}
