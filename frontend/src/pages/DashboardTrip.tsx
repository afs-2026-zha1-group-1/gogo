import { useEffect, useState } from 'react'
import { api } from '../api'
import Icon from '../Icons'
import type { IconName } from '../Icons'
import { useAuth } from '../features/auth/AuthProvider'
import { dashboardDateString } from './dashboardDate'
import { dashboardMilestones, dashboardNextStep, type ProgressSources } from './dashboardProgress'

interface TripSummary {
  id: number
  name: string
  destination: string
  startDate: string
  endDate: string
  startLocation: string | null
  endLocation: string | null
  organizerId: number
  mainPlanConfirmed: boolean
  joiningClosed: boolean
}

interface Readiness {
  readyCount: number
  memberCount: number
  viewerReady: boolean
}

interface Plan {
  confirmed: boolean
  stale: boolean
  stopCount: number
}

type SplitStatus = 'active' | 'confirmed' | 'cancelled'

interface Overview {
  trip: TripSummary
  readiness: Readiness
  plan: Plan | null
  split: SplitStatus | null
}

type OverviewState =
  | { kind: 'loading' }
  | { kind: 'ready'; overview: Overview }
  | { kind: 'error'; message: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonnegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function positiveInteger(value: unknown): value is number {
  return nonnegativeInteger(value) && value > 0
}

function nonemptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function nullableString(value: unknown): boolean {
  return value === null || nonemptyString(value)
}

function nullableInteger(value: unknown): boolean {
  return value === null || nonnegativeInteger(value)
}

function parseTrip(value: unknown, tripId: number): TripSummary {
  if (!isRecord(value) || value.id !== tripId || !nonemptyString(value.name)
    || !nonemptyString(value.destination) || !dashboardDateString(value.startDate) || !dashboardDateString(value.endDate)
    || value.startDate > value.endDate || !positiveInteger(value.organizerId)
    || !(value.startLocation === null || nonemptyString(value.startLocation))
    || !(value.endLocation === null || nonemptyString(value.endLocation))
    || typeof value.mainPlanConfirmed !== 'boolean' || typeof value.joiningClosed !== 'boolean') {
    throw new Error('行程数据无效')
  }
  return {
    id: tripId,
    name: value.name,
    destination: value.destination,
    startDate: value.startDate,
    endDate: value.endDate,
    startLocation: value.startLocation,
    endLocation: value.endLocation,
    organizerId: value.organizerId,
    mainPlanConfirmed: value.mainPlanConfirmed,
    joiningClosed: value.joiningClosed,
  }
}

function parseReadiness(value: unknown, tripId: number, userId: number): Readiness {
  if (!isRecord(value) || value.tripId !== tripId || !positiveInteger(value.memberCount)
    || !nonnegativeInteger(value.readyCount) || value.readyCount > value.memberCount
    || !Array.isArray(value.members) || value.members.length !== value.memberCount
    || !Array.isArray(value.commonInterests) || !Array.isArray(value.mustDo)
    || !Array.isArray(value.budgets) || !Array.isArray(value.rules)) {
    throw new Error('偏好就绪数据无效')
  }
  const members: { userId: number; ready: boolean }[] = value.members.map((member: unknown) => {
    if (!isRecord(member) || !positiveInteger(member.userId) || !nonemptyString(member.displayName)
      || typeof member.ready !== 'boolean' || !nonnegativeInteger(member.preferenceRevision)) {
      throw new Error('成员就绪数据无效')
    }
    return { userId: member.userId, ready: member.ready }
  })
  const viewer = members.find((member) => member.userId === userId)
  if (!viewer || new Set(members.map((member) => member.userId)).size !== members.length
    || members.filter((member) => member.ready).length !== value.readyCount) {
    throw new Error('偏好就绪数据不一致')
  }
  return { readyCount: value.readyCount, memberCount: value.memberCount, viewerReady: viewer.ready }
}

function parsePlan(value: unknown, tripId: number): Plan {
  if (!isRecord(value) || value.tripId !== tripId || !positiveInteger(value.version)
    || typeof value.confirmed !== 'boolean' || typeof value.stale !== 'boolean'
    || !nonnegativeInteger(value.costPerPersonCents) || !Array.isArray(value.inputRevisions)
    || !Array.isArray(value.stops) || (value.confirmed && value.stale)) {
    throw new Error('主线方案数据无效')
  }
  if (!value.inputRevisions.every((revision: unknown) => isRecord(revision)
    && positiveInteger(revision.userId) && nonnegativeInteger(revision.revision))
    || !value.stops.every((stop: unknown) => isRecord(stop) && positiveInteger(stop.seq)
      && nonemptyString(stop.name) && nonemptyString(stop.startTime) && nonemptyString(stop.endTime)
      && (stop.travelMinutesToNext === null || nonnegativeInteger(stop.travelMinutesToNext))
      && Array.isArray(stop.interests) && stop.interests.every((item: unknown) => typeof item === 'string'))) {
    throw new Error('主线方案数据无效')
  }
  return { confirmed: value.confirmed, stale: value.stale, stopCount: value.stops.length }
}

function parseSplit(value: unknown): SplitStatus | null {
  if (!isRecord(value) || value.error !== null || !('data' in value)) {
    throw new Error('分队数据无效')
  }
  if (value.data === null) return null
  const draft = value.data
  if (!isRecord(draft) || !nonemptyString(draft.initiatorMemberId)
    || !positiveInteger(draft.mainPlanVersion) || !positiveInteger(draft.draftVersion)
    || !['active', 'confirmed', 'cancelled'].includes(String(draft.status))
    || !isRecord(draft.groups) || !Object.values(draft.groups).every((group) =>
      Array.isArray(group) && group.every(nonemptyString))
    || !Array.isArray(draft.mainPlanStops)
    || !Array.isArray(draft.routes) || !nonemptyString(draft.createdAt)
    || !nonemptyString(draft.updatedAt) || !nullableString(draft.departureStopId)
    || !nullableString(draft.reunionStopId) || !nullableString(draft.departureAt)
    || !nullableString(draft.reunionAt) || !nullableInteger(draft.windowMinutes)
    || !draft.mainPlanStops.every((stop: unknown) => isRecord(stop) && nonemptyString(stop.id)
      && nonemptyString(stop.name) && nonemptyString(stop.startAt) && nonemptyString(stop.endAt))
    || !draft.routes.every((route: unknown) => isRecord(route) && nonemptyString(route.groupLabel)
      && nullableString(route.activityName) && nullableString(route.departureStopId)
      && nullableString(route.reunionStopId) && nullableInteger(route.activityMinutes)
      && (route.travelLegsMinutes === null || (Array.isArray(route.travelLegsMinutes)
        && route.travelLegsMinutes.every(nullableInteger)))
      && nullableInteger(route.bufferMinutes))) {
    throw new Error('分队数据无效')
  }
  if (draft.status === 'active' || draft.status === 'confirmed' || draft.status === 'cancelled') {
    return draft.status
  }
  throw new Error('分队状态无效')
}

export default function DashboardTrip({ tripId, onTripReady }: {
  tripId: number | null
  onTripReady?: (tripId: number) => void
}) {
  const { account } = useAuth()
  const [state, setState] = useState<OverviewState>({ kind: 'loading' })

  useEffect(() => {
    if (tripId === null || !account) return
    let active = true
    setState({ kind: 'loading' })
    Promise.all([
      api<unknown>(`/api/trips/${tripId}`),
      api<unknown>(`/api/trips/${tripId}/main-plan/inputs`),
      api<unknown>(`/api/trips/${tripId}/main-plan`),
      api<unknown>(`/api/trips/${tripId}/split-draft`),
    ]).then(([tripResult, inputsResult, planResult, splitResult]) => {
      if (!tripResult.ok) {
        if (tripResult.status === 403) throw new Error('无权查看此行程')
        if (tripResult.status === 404) throw new Error('未找到行程')
        throw new Error(`行程读取失败：HTTP ${tripResult.status}`)
      }
      if (!inputsResult.ok) throw new Error(`偏好就绪读取失败：HTTP ${inputsResult.status}`)
      if (!splitResult.ok) throw new Error(`分队读取失败：HTTP ${splitResult.status}`)
      const trip = parseTrip(tripResult.data, tripId)
      const readiness = parseReadiness(inputsResult.data, tripId, account.id)
      let plan: Plan | null
      if (planResult.ok) {
        plan = parsePlan(planResult.data, tripId)
      } else if (planResult.status === 404 && isRecord(planResult.data) && planResult.data.code === 'NO_DRAFT') {
        plan = null
      } else {
        throw new Error(`主线方案读取失败：HTTP ${planResult.status}`)
      }
      const split = parseSplit(splitResult.data)
      if ((plan?.confirmed ?? false) !== trip.mainPlanConfirmed
        || ((split === 'active' || split === 'confirmed') && !trip.mainPlanConfirmed)) {
        throw new Error('行程数据不一致，请刷新重试')
      }
      if (active) {
        setState({ kind: 'ready', overview: { trip, readiness, plan, split } })
        onTripReady?.(tripId)
      }
    }).catch((cause: unknown) => {
      if (active) setState({ kind: 'error', message: cause instanceof Error ? cause.message : '未知错误' })
    })
    return () => { active = false }
  }, [tripId, account, onTripReady])

  if (tripId === null) return <p role="alert" className="error">无效的行程编号</p>
  if (state.kind === 'loading') return <p className="loading">正在加载行程概览…</p>
  if (state.kind === 'error') return <p role="alert" className="error">无法加载行程概览：{state.message}</p>

  const { trip, readiness, plan, split } = state.overview
  const planLabel = !plan ? '未生成' : plan.confirmed ? '已确认' : plan.stale ? '草稿已过期' : '草稿'
  const splitLabel = split === null ? '未发起' : split === 'active' ? '进行中' : split === 'confirmed' ? '已确认' : '已取消'
  const sources: ProgressSources = {
    mainPlanConfirmed: trip.mainPlanConfirmed,
    joiningClosed: trip.joiningClosed,
    isOrganizer: trip.organizerId === account?.id,
    ...readiness,
    plan: !plan ? 'absent' : plan.confirmed ? 'confirmed' : plan.stale ? 'stale' : 'draft',
    split: split ?? 'absent',
  }
  const nextStep = dashboardNextStep(sources)
  const milestoneIcons: Record<string, IconName> = {
    建局: 'check', 偏好: 'star', 邀请: 'link', 主线: 'list',
    分队: 'branch',
  }

  return (
    <>
      <section className="hero">
        <div className="htop"><Icon name="cal" className="sm" /> {trip.startDate} – {trip.endDate}</div>
        <h1>{trip.name}</h1>
        <div className="hdest"><Icon name="pin" className="sm" /> {trip.destination}</div>
        <div className="hmeta">
          <div>出发地<b>{trip.startLocation ?? '未设置'}</b></div>
          <div>返程地<b>{trip.endLocation ?? '未设置'}</b></div>
          <div>同行<b>{readiness.memberCount} 人</b></div>
        </div>
      </section>
      <section className={`dashboard-progress${sources.isOrganizer ? '' : ' member'}`} aria-label="旅程进度">
        <h2><Icon name="nav" className="sm" /> 旅程进度</h2>
        <div className="card pad">
          <ol>
            {dashboardMilestones(sources).map((milestone) => (
              <li
                key={milestone.label}
                data-state={milestone.state}
                aria-label={`${milestone.label}：${milestone.detail}${milestone.state === 'done' ? '，已完成' : milestone.state === 'active' ? '，进行中' : ''}`}
              >
                <span className="dashboard-progress-icon"><Icon name={milestone.state === 'done' ? 'check' : milestoneIcons[milestone.label]} className="sm" /></span>
                <strong>{milestone.label}</strong>
                <span>{milestone.detail}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <div className="dashboard-stat-grid">
        <section className="dashboard-stat" aria-label="成员">
          <div className="dashboard-stat-label"><Icon name="users" className="sm" /> 成员</div>
          <div className="dashboard-stat-value">{readiness.memberCount}<small> 人</small></div>
        </section>
        <section className="dashboard-stat" aria-label="偏好就绪">
          <div className="dashboard-stat-label"><Icon name="check" className="sm" /> 偏好就绪</div>
          <div className="dashboard-stat-value">{readiness.readyCount}/{readiness.memberCount}</div>
        </section>
        <section className="dashboard-stat" aria-label="主线方案">
          <div className="dashboard-stat-label"><Icon name="list" className="sm" /> 主线方案</div>
          <div className="dashboard-stat-status">{planLabel}</div>
          {plan && <div className="hint">{plan.stopCount} 个活动</div>}
        </section>
        <section className="dashboard-stat" aria-label="智能分队">
          <div className="dashboard-stat-label"><Icon name="branch" className="sm" /> 智能分队</div>
          <div className="dashboard-stat-status">{splitLabel}</div>
        </section>
      </div>
      <section className="dashboard-next card pad" aria-label="下一步">
        <h2><Icon name="sparkle" className="sm" /> 下一步</h2>
        <p>{nextStep.hint}</p>
        <a className="btn btn-primary" href={nextStep.destination === 'split'
          ? `/trips/${trip.id}/split?from=dashboard`
          : `#/dashboard/trips/${trip.id}/${nextStep.destination}${nextStep.destination === 'main-plan/inputs' ? '?from=dashboard' : ''}`}>
          {nextStep.label}
        </a>
        {sources.viewerReady && !sources.joiningClosed && sources.plan === 'absent' && (
          <a className="btn btn-ghost" style={{ marginTop: 10 }} href={`#/dashboard/trips/${trip.id}/invite`}>
            邀请朋友
          </a>
        )}
      </section>
      <section aria-label="快捷入口">
        <div className="sec-title"><Icon name="list" className="sm" /> 快捷入口</div>
        <div className="dashboard-quick">
          <a className="qcard" href="#/create">
            <span className="qi"><Icon name="plus" /></span>
            <span><span className="qt">创建行程</span><span className="qd">开启新的旅程</span></span>
          </a>
          <a className="qcard" href={`#/dashboard/trips/${trip.id}/invite`}>
            <span className="qi"><Icon name="link" /></span>
            <span><span className="qt">邀请朋友</span><span className="qd">分享邀请链接</span></span>
          </a>
          <a className="qcard" href={`#/dashboard/trips/${trip.id}/preferences`}>
            <span className="qi"><Icon name="star" /></span>
            <span><span className="qt">我的偏好</span><span className="qd">查看和编辑偏好</span></span>
          </a>
          <a className="qcard" href={`#/dashboard/trips/${trip.id}/main-plan`}>
            <span className="qi"><Icon name="list" /></span>
            <span><span className="qt">主线方案</span><span className="qd">查看共同路线</span></span>
          </a>
        </div>
      </section>
    </>
  )
}
