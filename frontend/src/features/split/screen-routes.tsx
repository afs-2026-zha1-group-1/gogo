import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useParams } from "react-router-dom"
import { useSplitNavigate } from "./split-navigation"
import { SplitApiError } from "./api"
import {
  useAssignGroup,
  useCheckTiming,
  useGenerateRoutes,
  useRoundIndex,
  useSaveActivities,
  useSaveRoutes,
  useSplitDraft,
  useTripMembers,
} from "./hooks"
import { useAuth } from "../auth/AuthProvider"
import { SplitLayout } from "./split-layout"
import { EmptyState, ErrorState, LoadingState } from "./states"
import { RouteCard } from "./route-card"
import { cardRowOrder, hasEntryLeg } from "./route-rows"
import { cleanStationName } from "./station-name"
import type { ActivitySource, GroupRoute, RouteActivity, RouteEditInput, TimingResult } from "./types"
import type { TripMember } from "../../types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { AiGeneratingNotice } from "@/components/AiGeneratingNotice"
import { IconAlert, IconArrowRight, IconBranch, IconCheck, IconEdit, IconFlag, IconNav, IconRoute, IconSparkle, IconUsers, IconX } from "@/components/icons"
import { formatClock, formatCost, shortId } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Screen 13 — group routes and inline route editing (spec US-040 + US-042 + US-087 + US-088). Group chips move a
 * member between A/B (any trip member, user ruling 2026-11-17). While the draft is active the A/B route cards become
 * editable: group A exposes read-only stop names with editable stay/travel minutes, group B exposes the single
 * activity breakdown plus an optional location. Each stop row also carries the group's per-person cost, so time and
 * budget are edited on one card instead of a separate costed-activity card. Next saves dirty edits first (route pair
 * and activity lists), then asks the backend to check the reunion window; feasible=false keeps the user here behind
 * a blocking dialog, while feasible=true moves on to the read-only team-route preview (Screen 13b). The client never
 * declares feasibility itself.
 */
interface StepForm {
  name: string
  minutes: string
  cost: string
  /** 已存在的费用行：保留服务端名称/地点/来源，只开放费用编辑（沿主线、AI 或手动）。 */
  activityName: string | null
  location: string | null
  source: ActivitySource | null
}

interface ExtraActivityForm {
  name: string
  location: string | null
  cost: string
  source: ActivitySource
}

interface RouteForm {
  groupLabel: string
  steps: StepForm[]
  travelLegsMinutes: string[]
  /** 没有对应站点的费用行（历史 AI/手动活动），保留以便随卡一起展示与清理。 */
  extras: ExtraActivityForm[]
}

/** 分 → 输入框里的元，去掉多余的 0（1250 → 12.5）。 */
function centsToInput(cents: number): string {
  const major = cents / 100
  return Number.isInteger(major) ? String(major) : major.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")
}

function toForm(route: GroupRoute): RouteForm {
  const rawSteps = route.steps && route.steps.length > 0
    ? route.steps
    : route.activityName
      ? [{ name: route.activityName, minutes: route.activityMinutes ?? 0 }]
      : []
  const activities = route.activities ?? []
  const used = new Set<number>()
  const steps = rawSteps.map((step) => {
    const name = cleanStationName(step.name)
    const index = activities.findIndex(
      (activity, position) => !used.has(position) && cleanStationName(activity.name) === name,
    )
    if (index >= 0) used.add(index)
    const activity = index >= 0 ? activities[index] : null
    return {
      name,
      minutes: String(step.minutes),
      cost: activity ? centsToInput(activity.costCents) : "",
      activityName: activity ? activity.name : null,
      location: activity ? activity.location : null,
      source: activity ? activity.source : null,
    }
  })
  return {
    groupLabel: route.groupLabel,
    steps,
    travelLegsMinutes: (route.travelLegsMinutes ?? []).map((minutes) => (minutes != null ? String(minutes) : "")),
    extras: activities
      .filter((_, position) => !used.has(position))
      .map((activity) => ({
        name: activity.name,
        location: activity.location,
        cost: centsToInput(activity.costCents),
        source: activity.source,
      })),
  }
}

function toNum(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function toApiRoute(form: RouteForm): RouteEditInput {
  return {
    groupLabel: form.groupLabel === "B" ? "B" : "A",
    steps: form.steps.map((step) => ({ name: step.name.trim(), minutes: toNum(step.minutes) })),
    travelLegsMinutes: form.travelLegsMinutes.map(toNum),
  }
}

function displayMinutes(value: string): string {
  const trimmed = value.trim()
  return trimmed === "" ? "—" : `${trimmed} 分`
}

function formTotal(form: RouteForm): number | null {
  const stays = form.steps.map((step) => toNum(step.minutes))
  const legs = form.travelLegsMinutes.map(toNum)
  if (stays.some((minutes) => minutes == null) || legs.some((minutes) => minutes == null)) return null
  return stays.reduce<number>((sum, minutes) => sum + (minutes ?? 0), 0)
    + legs.reduce<number>((sum, minutes) => sum + (minutes ?? 0), 0)
}

function routeName(form: RouteForm): string {
  const first = cleanStationName(form.steps[0]?.name)
  const last = cleanStationName(form.steps[form.steps.length - 1]?.name)
  if (!first) return "未命名路线"
  return !last || first === last ? first : `${first} → ${last}`
}

/** 输入框里的元 → 分；空值算 0（未填费用），非法值返回 null。 */
function parseCostCents(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return 0
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 100)
}

/** 一张卡片上的站点与费用合成一份活动清单：接口仍按组整表替换（US-045）。 */
function toActivities(form: RouteForm): RouteActivity[] {
  const activities: RouteActivity[] = []
  for (const step of form.steps) {
    const costCents = parseCostCents(step.cost)
    if (step.activityName == null) {
      // 新站点没填费用就不产生费用记录，避免每站都多出一条 0 元活动。
      if (!costCents) continue
      activities.push({
        name: cleanStationName(step.name) || "未命名活动",
        location: null,
        costCents,
        source: "manual",
      })
      continue
    }
    activities.push({
      name: step.activityName,
      location: step.location,
      costCents: costCents ?? 0,
      source: step.source ?? "manual",
    })
  }
  for (const extra of form.extras) {
    activities.push({
      name: extra.name,
      location: extra.location,
      costCents: parseCostCents(extra.cost) ?? 0,
      source: extra.source,
    })
  }
  return activities
}

/** 只比较站名/停留/路程，费用改动不必重写路线。 */
function routeTimeKey(form: RouteForm): string {
  return JSON.stringify({
    steps: form.steps.map((step) => [step.name, step.minutes]),
    legs: form.travelLegsMinutes,
  })
}

function formCostTotal(form: RouteForm): number {
  return toActivities(form).reduce((sum, activity) => sum + activity.costCents, 0)
}

export function ScreenRoutes() {
  const { tripId = "" } = useParams()
  const roundIndex = useRoundIndex()
  const navigate = useSplitNavigate()
  const { search } = useLocation()
  const dashboardOrigin = new URLSearchParams(search).get("from") === "dashboard"
  const draft = useSplitDraft(tripId, roundIndex)
  const generate = useGenerateRoutes(tripId, roundIndex)
  const assign = useAssignGroup(tripId, roundIndex)
  const save = useSaveRoutes(tripId, roundIndex)
  const saveActivities = useSaveActivities(tripId, roundIndex)
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

  const stopNames = new Map((detail?.mainPlanStops ?? []).map((stop) => [stop.id, cleanStationName(stop.name)]))
  const nameOf = (id: string | null) => (id ? (stopNames.get(id) ?? "未知节点") : "—")
  const tripStartName = detail?.mainPlanStops[0] ? cleanStationName(detail.mainPlanStops[0].name) : "行程起点"
  /**
   * The place a route sets off from. FROM_START has no departure stop id: with no leading leg the first
   * stop is the start; a stale draft that still leads with a leg is anchored to the trip start instead.
   */
  const departureNameFor = (route: GroupRoute) => {
    if (route.departureStopId) return nameOf(route.departureStopId)
    const steps = route.steps ?? []
    const entry = hasEntryLeg(steps.length, route.travelLegsMinutes?.length ?? 0)
    return !entry && steps[0] ? cleanStationName(steps[0].name) : tripStartName
  }
  /** Only a stale FROM_START draft still opens with a travel leg; then the card needs its origin row. */
  const originNameFor = (route: GroupRoute) => (
    detail?.splitMode === "FROM_START" && hasEntryLeg((route.steps ?? []).length, route.travelLegsMinutes?.length ?? 0)
      ? tripStartName
      : null
  )
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
  const pending = save.isPending || saveActivities.isPending || check.isPending

  // US-045: only the initiator may edit the draft (boundaries/routes/activities), matching the backend gate.
  const canEditActivities = draftActive && myId != null && detail?.initiatorMemberId === myId

  useEffect(() => {
    if (!detail || detail.routes.length !== 2) return
    if (initializedVersion.current === detail.draftVersion) return
    initializedVersion.current = detail.draftVersion
    setForm(detail.routes.map(toForm))
    setFormVersion(detail.draftVersion)
  }, [detail])

  const baseline = useMemo(() => (hasPair ? routes.map(toForm) : []), [routes, hasPair])
  const baselineTime = useMemo(() => baseline.map(routeTimeKey), [baseline])
  const baselineActivities = useMemo(() => baseline.map(toActivities), [baseline])
  const routesDirty =
    editable && form.length === 2 && form.map(routeTimeKey).join("|") !== baselineTime.join("|")
  const activitiesDirty =
    canEditActivities && form.length === 2
    && form.some((item, index) => JSON.stringify(toActivities(item)) !== JSON.stringify(baselineActivities[index]))

  const patchRoute = (index: number, patch: Partial<RouteForm>) =>
    setForm((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)))

  const onNext = async () => {
    if (!detail || !hasPair || detail.windowMinutes == null) return
    setDialog(null)
    setActionError(null)
    try {
      let snapshot = detail.routes
      let version = detail.draftVersion
      if (routesDirty) {
        const saved = await save.mutateAsync({
          draftVersion: version,
          routes: form.map(toApiRoute),
        })
        snapshot = saved.routes
        version = saved.draftVersion
      }
      if (activitiesDirty) {
        // 费用仍走 US-045 的整表替换接口，按组顺序保存，后续请求带上刚返回的草稿版本。
        for (const [index, item] of form.entries()) {
          const next = toActivities(item)
          if (JSON.stringify(next) === JSON.stringify(baselineActivities[index])) continue
          const saved = await saveActivities.mutateAsync({
            groupLabel: item.groupLabel === "B" ? "B" : "A",
            draftVersion: version,
            activities: next,
          })
          version = saved.draftVersion
        }
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
        navigate(`/trips/${tripId}/split/rounds/${roundIndex}/preview`)
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
      title={roundIndex > 1 ? `第 ${roundIndex} 次分队 · 分组与路线` : "分组与路线"}
      subtitle="可调整路线 · 下一步校验时间窗"
      step={2}
      backTo={`/trips/${tripId}/split/rounds/${roundIndex}/boundaries`}
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
            <Button size="sm" onClick={() => navigate(`/trips/${tripId}/split/rounds/${roundIndex}/boundaries`)}>
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
              {detail.splitMode === "FROM_START" ? "从行程起点开始分头" : `分头 ${formatClock(detail.departureAt, detail.destination)}`}
              {" → "}
              会合 {formatClock(detail.reunionAt, detail.destination)}
              （窗口 {detail.windowMinutes} 分钟）；两条路线的合计都需不超过它。
            </p>
          )}

          {generate.isPending ? (
            <AiGeneratingNotice />
          ) : null}

          {hasPair ? (
            <div className="flex flex-col gap-3">
              {routes.map((route, index) => (
                <Fragment key={route.groupLabel}>
                {editable && formVersion === detail.draftVersion ? (
                  <EditableRouteCard
                    key={route.groupLabel}
                    form={form[index] ?? toForm(route)}
                    tone={route.groupLabel === "B" ? "b" : "a"}
                    editable={editable && !pending}
                    canEditCosts={canEditActivities && !pending}
                    destination={detail.destination}
                    departureName={departureNameFor(route)}
                    originName={originNameFor(route)}
                    reunionName={nameOf(route.reunionStopId)}
                    reunionClock={formatClock(detail.reunionAt, detail.destination)}
                    windowMinutes={detail.windowMinutes}
                    onStepNameChange={(stepIndex, name) =>
                      patchRoute(index, {
                        steps: (form[index]?.steps ?? []).map((step, itemIndex) =>
                          itemIndex === stepIndex ? { ...step, name } : step,
                        ),
                      })
                    }
                    onStepMinutesChange={(stepIndex, minutes) =>
                      patchRoute(index, {
                        steps: (form[index]?.steps ?? []).map((step, itemIndex) =>
                          itemIndex === stepIndex ? { ...step, minutes } : step,
                        ),
                      })
                    }
                    onStepCostChange={(stepIndex, cost) =>
                      patchRoute(index, {
                        steps: (form[index]?.steps ?? []).map((step, itemIndex) =>
                          itemIndex === stepIndex ? { ...step, cost } : step,
                        ),
                      })
                    }
                    onExtraCostChange={(extraIndex, cost) =>
                      patchRoute(index, {
                        extras: (form[index]?.extras ?? []).map((extra, itemIndex) =>
                          itemIndex === extraIndex ? { ...extra, cost } : extra,
                        ),
                      })
                    }
                    onRemoveExtra={(extraIndex) =>
                      patchRoute(index, {
                        extras: (form[index]?.extras ?? []).filter((_, itemIndex) => itemIndex !== extraIndex),
                      })
                    }
                    onLegChange={(legIndex, minutes) =>
                      patchRoute(index, {
                        travelLegsMinutes: (form[index]?.travelLegsMinutes ?? []).map((value, itemIndex) =>
                          itemIndex === legIndex ? minutes : value,
                        ),
                      })
                    }
                    onAddStep={() => {
                      const current = form[index]
                      if (!current) return
                      patchRoute(index, {
                        steps: [
                          ...current.steps,
                          { name: "", minutes: "0", cost: "", activityName: null, location: null, source: null },
                        ],
                        travelLegsMinutes: [...current.travelLegsMinutes, "0"],
                      })
                    }}
                    onRemoveStep={(stepIndex) => {
                      const current = form[index]
                      if (!current || current.steps.length <= 1) return
                      const entry = hasEntryLeg(current.steps.length, current.travelLegsMinutes.length)
                      const legIndex = entry ? stepIndex + 1 : stepIndex
                      patchRoute(index, {
                        steps: current.steps.filter((_, itemIndex) => itemIndex !== stepIndex),
                        travelLegsMinutes: current.travelLegsMinutes.filter((_, itemIndex) => itemIndex !== legIndex),
                      })
                    }}
                  />
                ) : (
                  <RouteCard
                    key={route.groupLabel}
                    route={route}
                    tone={route.groupLabel === "B" ? "b" : "a"}
                    departureName={departureNameFor(route)}
                    originName={originNameFor(route)}
                    reunionName={nameOf(route.reunionStopId)}
                    reunionClock={formatClock(detail.reunionAt, detail.destination)}
                    destination={detail.destination}
                    stale={(detail.groups[route.groupLabel] ?? []).length === 0}
                    windowMinutes={detail.windowMinutes}
                  />
                )}
                </Fragment>
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
  canEditCosts,
  destination,
  departureName,
  originName,
  reunionName,
  reunionClock,
  windowMinutes,
  onStepNameChange,
  onStepMinutesChange,
  onStepCostChange,
  onExtraCostChange,
  onRemoveExtra,
  onLegChange,
  onAddStep,
  onRemoveStep,
}: {
  form: RouteForm
  tone: "a" | "b"
  editable: boolean
  canEditCosts: boolean
  destination: string | null
  departureName: string
  originName: string | null
  reunionName: string
  reunionClock: string
  windowMinutes: number | null
  onStepNameChange: (stepIndex: number, name: string) => void
  onStepMinutesChange: (stepIndex: number, minutes: string) => void
  onStepCostChange: (stepIndex: number, cost: string) => void
  onExtraCostChange: (extraIndex: number, cost: string) => void
  onRemoveExtra: (extraIndex: number) => void
  onLegChange: (legIndex: number, minutes: string) => void
  onAddStep: () => void
  onRemoveStep: (stepIndex: number) => void
}) {
  const head = tone === "a" ? "from-a to-[#1e40af]" : "from-b to-[#9a3412]"
  const total = formTotal(form)
  const costTotal = formCostTotal(form)
  const [editingRow, setEditingRow] = useState<string | null>(null)
  const stationKey = (index: number) => `${form.groupLabel}-station-${index}`
  const legKey = (index: number) => `${form.groupLabel}-leg-${index}`
  const overrun = total != null && windowMinutes != null ? Math.max(0, total - windowMinutes) : null
  const inputClass =
    "w-full rounded-control border border-line bg-surface px-2 py-1.5 text-[12px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:bg-surface-3 disabled:text-ink-3"
  const numberClass =
    "w-14 shrink-0 rounded-control border border-line bg-surface px-2 py-1 text-[12px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:bg-surface-3 disabled:text-ink-3"
  const costClass = cn(numberClass, "w-16")
  const renderLeg = (legIndex: number) => {
    const minutes = form.travelLegsMinutes[legIndex]
    if (minutes === undefined) return null
    const key = legKey(legIndex)
    if (editingRow !== key) {
      return (
        <div key={key} className="flex items-center justify-between gap-2 px-1 py-1">
          <span className="text-[12px] text-ink-2">路程</span>
          <div className="flex items-center gap-2">
            <span className="text-[12px] tabular-nums text-ink-2">{displayMinutes(minutes)}</span>
            {editable ? (
              <button
                type="button"
                aria-label={`${form.groupLabel} 组 编辑路程 ${legIndex + 1}`}
                onClick={() => setEditingRow(key)}
                className="grid size-7 place-items-center rounded-[8px] text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink [&_svg]:size-3.5"
              >
                <IconEdit />
              </button>
            ) : null}
          </div>
        </div>
      )
    }
    return (
      <div key={key} className="flex items-center justify-between gap-2 rounded-[9px] bg-surface-3/70 px-2 py-1.5">
        <span className="text-[12px] text-ink-2">路程</span>
        <div className="flex items-center gap-1.5">
          <input
            aria-label={`${form.groupLabel} 组 路程 ${legIndex + 1}`}
            type="number"
            min={0}
            className={numberClass}
            value={minutes}
            disabled={!editable}
            onChange={(event) => onLegChange(legIndex, event.target.value)}
          />
          <button
            type="button"
            aria-label={`${form.groupLabel} 组 完成编辑路程 ${legIndex + 1}`}
            onClick={() => setEditingRow(null)}
            className="grid size-7 place-items-center rounded-[8px] bg-white text-ink-2 shadow-sm transition-colors hover:text-ink [&_svg]:size-3.5"
          >
            <IconCheck />
          </button>
        </div>
      </div>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className={cn("flex items-center gap-3 bg-gradient-to-r px-4 py-3 text-white", head)}>
        <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-white/25 text-sm font-extrabold">
          {form.groupLabel}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold">{routeName(form)}</div>
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
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold text-ink-3">站点（站名、停留与人均费用可改）</span>
          <Button
            size="sm"
            variant="outline"
            disabled={!editable}
            onClick={() => {
              onAddStep()
              setEditingRow(stationKey(form.steps.length))
            }}
          >
            添加站点
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          {cardRowOrder(form.steps.length, form.travelLegsMinutes.length).map((row) => {
            if (row.kind === "origin") {
              return originName ? (
                <div key="origin" className="flex items-center gap-1 px-1 py-1 text-[11px] font-semibold text-ink-3">
                  <IconNav className="size-3 shrink-0" /> 从 {originName} 出发
                </div>
              ) : null
            }
            if (row.kind === "leg") return <Fragment key={legKey(row.leg)}>{renderLeg(row.leg)}</Fragment>
            const index = row.step
            const step = form.steps[index]
            const key = stationKey(index)
            return (
              <Fragment key={key}>
                {editingRow === key ? (
                  <div className="flex items-center gap-2 rounded-[9px] bg-surface-3/70 p-1.5">
                    <input
                      aria-label={`${form.groupLabel} 组 第 ${index + 1} 站名称`}
                      className={cn(inputClass, "h-8 py-1", !step.name.trim() && "bg-brand-soft/50 placeholder:text-ink-3")}
                      placeholder="新站点"
                      autoFocus={!step.name.trim()}
                      value={step.name}
                      disabled={!editable}
                      onChange={(event) => onStepNameChange(index, event.target.value)}
                    />
                    <input
                      aria-label={`${form.groupLabel} 组 第 ${index + 1} 站停留分钟`}
                      type="number"
                      min={0}
                      className={cn(numberClass, "h-8 py-1")}
                      value={step.minutes}
                      disabled={!editable}
                      onChange={(event) => onStepMinutesChange(index, event.target.value)}
                    />
                    <input
                      aria-label={`${form.groupLabel} 组 第 ${index + 1} 站人均费用`}
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="人均费用"
                      className={cn(costClass, "h-8 py-1")}
                      value={step.cost}
                      disabled={!editable || !canEditCosts}
                      onChange={(event) => onStepCostChange(index, event.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={`${form.groupLabel} 组 完成编辑第 ${index + 1} 站`}
                      onClick={() => setEditingRow(null)}
                      className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-white text-ink-2 shadow-sm transition-colors hover:text-ink [&_svg]:size-3.5"
                    >
                      <IconCheck />
                    </button>
                    {form.steps.length > 1 ? (
                      <button
                        type="button"
                        aria-label={`${form.groupLabel} 组 删除第 ${index + 1} 站`}
                        onClick={() => {
                          onRemoveStep(index)
                          setEditingRow(null)
                        }}
                        className="grid size-7 shrink-0 place-items-center rounded-[8px] text-ink-3 transition-colors hover:bg-white hover:text-ink [&_svg]:size-3.5"
                      >
                        <IconX />
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-[9px] px-1 py-1">
                    <span className="min-w-0 flex-1 truncate text-[12px] text-ink">
                      {cleanStationName(step.name) || "未命名站点"}
                    </span>
                    <span className="text-[12px] tabular-nums text-ink-2">{displayMinutes(step.minutes)}</span>
                    <span className="w-16 shrink-0 text-right text-[12px] tabular-nums font-semibold text-ink">
                      {step.cost.trim() === "" ? "—" : formatCost(parseCostCents(step.cost), destination)}
                    </span>
                    {editable ? (
                      <button
                        type="button"
                        aria-label={`${form.groupLabel} 组 编辑第 ${index + 1} 站`}
                        onClick={() => setEditingRow(key)}
                        className="grid size-7 place-items-center rounded-[8px] text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink [&_svg]:size-3.5"
                      >
                        <IconEdit />
                      </button>
                    ) : null}
                  </div>
                )}
              </Fragment>
            )
          })}
        </div>

        {form.extras.length > 0 ? (
          <div className="flex flex-col gap-1.5 border-t border-line-2 pt-2">
            <span className="text-[10px] font-semibold text-ink-3">其他费用（不占时间）</span>
            {form.extras.map((extra, extraIndex) => (
              <div
                key={`${form.groupLabel}-extra-${extraIndex}`}
                className="flex items-center gap-2 rounded-[9px] px-1 py-1"
              >
                <span className="min-w-0 flex-1 truncate text-[12px] text-ink">
                  {cleanStationName(extra.name) || "未命名活动"}
                </span>
                <input
                  aria-label={`${form.groupLabel} 组 其他费用 ${extraIndex + 1} 人均费用`}
                  type="number"
                  min={0}
                  step="0.01"
                  className={cn(costClass, "h-8 py-1")}
                  value={extra.cost}
                  disabled={!editable || !canEditCosts}
                  onChange={(event) => onExtraCostChange(extraIndex, event.target.value)}
                />
                {canEditCosts ? (
                  <button
                    type="button"
                    aria-label={`${form.groupLabel} 组 删除其他费用 ${extraIndex + 1}`}
                    onClick={() => onRemoveExtra(extraIndex)}
                    className="grid size-7 shrink-0 place-items-center rounded-[8px] text-ink-3 transition-colors hover:bg-white hover:text-ink [&_svg]:size-3.5"
                  >
                    <IconX />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 border-t border-line-2 pt-2 text-[12px]">
          <span className="font-bold text-ink">合计 {total != null ? `${total} 分` : "—"}</span>
          <span className="flex items-center gap-2 text-ink-3">
            <span className="rounded-full bg-brand-soft px-2 py-0.5 font-semibold text-brand-ink">
              人均 {formatCost(costTotal, destination)}
            </span>
            {windowMinutes != null ? `窗口 ${windowMinutes} 分` : "窗口未知"}
          </span>
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
