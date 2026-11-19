import { useRef, useState } from 'react'
import Icon from '../Icons'
import CountdownCard from './CountdownCard'
import MyPlanTimeline from './MyPlanTimeline'
import { Button } from './ui/button'
import { Dialog } from './ui/dialog'
import { api, errorMessage } from '../api'
import { fetchDraftDetail, saveRoutes, SplitApiError } from '../features/split/api'
import { cleanStationName } from '../features/split/station-name'
import { useCountdown } from '../hooks/useCountdown'
import { localEndOfDay, localMidnight, type ScheduleItem } from '../lib/countdown'
import { useAuth } from '../features/auth/AuthProvider'
import type { TripOverviewState } from '../hooks/useTripOverview'
import type { MainPlan, PlanStop } from '../types/mainPlan'
import type { SplitDraftDetail } from '../features/split/types'

type ReadyState = Extract<TripOverviewState, { kind: 'ready' }>

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

/** Local HH:MM plus one hour, clamped to 23:59 (default end time for an appended stop). */
function nextHour(clock: string): string {
  const [hours, minutes] = clock.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '10:00'
  const total = Math.min(23 * 60 + 59, hours * 60 + minutes + 60)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

/** Whole minutes between two ISO instants, clamped at zero (fallback legs follow the main-line schedule). */
function minutesBetween(from: string | null, to: string | null): number {
  if (from == null || to == null) return 0
  const start = Date.parse(from)
  const finish = Date.parse(to)
  if (Number.isNaN(start) || Number.isNaN(finish)) return 0
  return Math.max(0, Math.round((finish - start) / 60_000))
}

/** One readable line for a rejected stop mutation (code plus message, or the HTTP status). */
function apiFailure(result: { status: number; ok: boolean; data: unknown }): string {
  if (!result.ok) {
    const error = result.data as { code?: string; message?: string } | null
    if (error?.message) return error.code ? `${error.code}: ${error.message}` : error.message
  }
  return `操作失败（HTTP ${result.status}）`
}

/**
 * When a group's last own node is deleted it walks the main-line stops inside the split window instead; a route
 * always needs at least one station, so empty step lists are never sent (A: legs per stop, B: surrounding legs).
 */
function mainLineFallback(detail: SplitDraftDetail, label: 'A' | 'B') {
  const stops = detail.mainPlanStops
  const departureIndex = detail.splitMode === 'FROM_START'
    ? 0
    : stops.findIndex((stop) => stop.id === detail.departureStopId)
  const reunionIndex = stops.findIndex((stop) => stop.id === detail.reunionStopId)
  const from = departureIndex >= 0 ? departureIndex : 0
  const windowStops = reunionIndex > from
    ? stops.slice(from, reunionIndex)
    : stops.slice(from, from + 1)
  if (windowStops.length === 0) {
    return { steps: [{ name: '待定', minutes: 0 }], travelLegsMinutes: label === 'B' ? [0, 0] : [0] }
  }
  const steps = windowStops.map((stop) => ({
    name: stop.name,
    minutes: minutesBetween(stop.startAt, stop.endAt),
  }))
  const legs: number[] = []
  if (label === 'B') legs.push(minutesBetween(detail.departureAt, windowStops[0].startAt))
  windowStops.forEach((stop, index) => {
    const nextStart = index + 1 < windowStops.length ? windowStops[index + 1].startAt : detail.reunionAt
    legs.push(minutesBetween(stop.endAt, nextStart))
  })
  return { steps, travelLegsMinutes: legs }
}

// US-083/084/085: compact overview (hero → countdown → fellow members → 我的方案),
// rendered by TripDetails only once a main plan exists. The R5 blocks (trip-info
// list, preference card, embedded invitation panel, main-plan link) live on the
// legacy page instead; invitation moves to the full-screen page via the app-bar
// person icon, main-plan confirmation stays on the MainPlan page (US-081).
export default function TripOverview({ state }: { state: ReadyState }) {
  const { account } = useAuth()
  const countdown = useCountdown(
    localMidnight(state.trip.startDate),
    state.schedule,
    localEndOfDay(state.trip.endDate),
  )

  const [editing, setEditing] = useState<PlanStop | null>(null)
  const [name, setName] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const [splitEditing, setSplitEditing] = useState<ScheduleItem['splitStep'] | null>(null)
  const [splitName, setSplitName] = useState('')
  const [splitMinutes, setSplitMinutes] = useState('')
  const [splitError, setSplitError] = useState<string | null>(null)
  const [splitSaving, setSplitSaving] = useState(false)
  const splitNameRef = useRef<HTMLInputElement>(null)

  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newStart, setNewStart] = useState('09:00')
  const [newEnd, setNewEnd] = useState('10:00')
  const [newNote, setNewNote] = useState('')
  const [mutateError, setMutateError] = useState<string | null>(null)
  const addNameRef = useRef<HTMLInputElement>(null)

  // US-090: main-plan stops edit through the stop endpoint; split nodes edit their round's route step.
  function openEdit(item: ScheduleItem) {
    if (item.splitStep != null) {
      setSplitEditing(item.splitStep)
      setSplitName(item.name)
      setSplitMinutes(String(item.splitStep.minutes))
      setSplitError(null)
      return
    }
    if (item.stopId == null || state.plan == null) return
    const stop = state.plan.stops.find((candidate) => candidate.id === item.stopId)
    if (!stop) return
    setEditing(stop)
    // 存量的「主线·」标记只是展示噪声，编辑框里只给真实活动名（地图按名称导航）。
    setName(cleanStationName(stop.name))
    setStart(stop.startTime)
    setEnd(stop.endTime)
    setNote(stop.note ?? '')
    setSaveError(null)
  }

  /** A split node edit rewrites that round's route pair, so the timeline and the route graph both follow. */
  async function saveSplitNode() {
    if (splitEditing == null) return
    const minutes = Number(splitMinutes)
    if (splitName.trim() === '' || !Number.isFinite(minutes) || minutes < 0) {
      setSplitError('请填写节点名称与不小于 0 的停留分钟。')
      return
    }
    setSplitSaving(true)
    setSplitError(null)
    const tripId = String(state.trip.id)
    try {
      const detail = await fetchDraftDetail(tripId, splitEditing.roundIndex)
      if (detail == null) {
        setSplitError('该轮分队草稿不存在或已取消。')
        return
      }
      const routes = detail.routes.map((route) => ({
        groupLabel: route.groupLabel as 'A' | 'B',
        steps: (route.steps ?? []).map((step, index) =>
          route.groupLabel === splitEditing.groupLabel && index === splitEditing.stepIndex
            ? { name: splitName.trim(), minutes }
            : { name: step.name, minutes: step.minutes },
        ),
        travelLegsMinutes: route.travelLegsMinutes,
      }))
      await saveRoutes(tripId, splitEditing.roundIndex, { draftVersion: detail.draftVersion, routes })
      setSplitEditing(null)
      state.reload()
    } catch (cause) {
      setSplitError(
        cause instanceof SplitApiError
          ? `${cause.code}: ${cause.message}`
          : `保存失败：${errorMessage(cause) ?? '请稍后再试'}`,
      )
    } finally {
      setSplitSaving(false)
    }
  }

  async function saveStop() {
    if (editing == null || editing.id == null || state.plan == null) return
    setSaving(true)
    setSaveError(null)
    try {
      const result = await api<MainPlan>(`/api/trips/${state.trip.id}/main-plan/stops/${editing.id}`, {
        method: 'PUT',
        body: { name: name.trim(), startTime: start, endTime: end, note: note.trim(), mainPlanVersion: state.plan.version },
      })
      if (!result.ok) {
        const error = result.ok ? null : result.data
        setSaveError(error?.message ? `${error.code}: ${error.message}` : `保存失败（HTTP ${result.status}）`)
        return
      }
      setEditing(null)
      state.reload()
    } catch {
      setSaveError('无法连接服务器，请稍后再试')
    } finally {
      setSaving(false)
    }
  }

  // US-090 新增节点: appended after the last stop, prefilled from that stop's end time.
  function openAdd() {
    if (state.plan == null) return
    const last = state.plan.stops[state.plan.stops.length - 1]
    const from = last?.endTime ?? '09:00'
    setNewName('')
    setNewStart(from)
    setNewEnd(nextHour(from))
    setNewNote('')
    setMutateError(null)
    setAdding(true)
  }

  async function saveNewStop() {
    if (state.plan == null || newName.trim() === '') return
    setSaving(true)
    setMutateError(null)
    try {
      const result = await api<MainPlan>(`/api/trips/${state.trip.id}/main-plan/stops`, {
        method: 'POST',
        body: {
          name: newName.trim(),
          startTime: newStart,
          endTime: newEnd,
          note: newNote.trim(),
          mainPlanVersion: state.plan.version,
        },
      })
      if (!result.ok) {
        setMutateError(apiFailure(result))
        return
      }
      setAdding(false)
      state.reload()
    } catch {
      setMutateError('无法连接服务器，请稍后再试')
    } finally {
      setSaving(false)
    }
  }

  async function removeStop(item: ScheduleItem) {
    if (saving) return
    if (item.splitStep != null) {
      await removeSplitNode(item, item.splitStep)
      return
    }
    if (state.plan == null || item.stopId == null) return
    if (!window.confirm(`删除「${item.name}」这一站？删除后已生成的分队路线会作废。`)) return
    setSaving(true)
    setMutateError(null)
    try {
      const result = await api<MainPlan>(`/api/trips/${state.trip.id}/main-plan/stops/${item.stopId}`, {
        method: 'DELETE',
      })
      if (!result.ok) {
        setMutateError(apiFailure(result))
        return
      }
      state.reload()
    } catch {
      setMutateError('无法连接服务器，请稍后再试')
    } finally {
      setSaving(false)
    }
  }

  /** Removes one step from that round's route pair (and the leg leaving it), then refreshes timeline + graph. */
  async function removeSplitNode(item: ScheduleItem, step: NonNullable<ScheduleItem['splitStep']>) {
    if (!window.confirm(`删除分队节点「${item.name}」？删除后会更新这一轮的路线与路线图。`)) return
    setSaving(true)
    setMutateError(null)
    const tripId = String(state.trip.id)
    try {
      const detail = await fetchDraftDetail(tripId, step.roundIndex)
      if (detail == null) {
        setMutateError('该轮分队草稿不存在或已取消。')
        return
      }
      const routes = detail.routes.map((route) => {
        const label = route.groupLabel as 'A' | 'B'
        const steps = (route.steps ?? []).map((routeStep) => ({ name: routeStep.name, minutes: routeStep.minutes }))
        const legs = route.travelLegsMinutes ?? []
        if (label !== step.groupLabel) return { groupLabel: label, steps, travelLegsMinutes: legs }
        const remainingSteps = steps.filter((_, index) => index !== step.stepIndex)
        if (remainingSteps.length === 0) {
          // Deleting the group's only node leaves it walking the main-line stops inside the window (a route always
          // needs at least one station).
          return { groupLabel: label, ...mainLineFallback(detail, label) }
        }
        // Legs follow each stop for group A and surround them for group B; drop the one that left the removed step.
        const legIndex = label === 'B' ? step.stepIndex + 1 : Math.min(step.stepIndex, legs.length - 1)
        const remainingLegs = legs.filter((_, index) => index !== legIndex)
        return { groupLabel: label, steps: remainingSteps, travelLegsMinutes: remainingLegs }
      })
      await saveRoutes(tripId, step.roundIndex, { draftVersion: detail.draftVersion, routes })
      state.reload()
    } catch (cause) {
      setMutateError(
        cause instanceof SplitApiError
          ? `${cause.code}: ${cause.message}`
          : `删除失败：${errorMessage(cause) ?? '请稍后再试'}`,
      )
    } finally {
      setSaving(false)
    }
  }

  const isOrganizer = state.trip.organizerId === account?.id
  const readinessText = state.readiness == null ? null
    : state.readiness.readyCount === state.readiness.memberCount ? '偏好全部就绪'
      : `${state.readiness.readyCount}/${state.readiness.memberCount} 位成员已就绪`

  return (
    <div className="screen">
      <header className="appbar">
        <a className="iconbtn" href="#/" aria-label="Back"><Icon name="left" /></a>
        <div className="grow">
          <div className="title">行程详情</div>
          <div className="sub">US-002 · 全员可见</div>
        </div>
        <a className="iconbtn" href={`#/trips/${state.trip.id}/edit`} aria-label="编辑行程信息">
          <Icon name="edit" />
        </a>
        <a className="iconbtn" href={`#/trips/${state.trip.id}/invitation`} aria-label="邀请朋友">
          <Icon name="user" />
        </a>
      </header>
      <div className="body">
        <section className="hero">
          <h1 style={{ marginTop: 0 }}>{state.trip.name}</h1>
          <div className="hdest">
            <Icon name="cal" className="sm" />
            {state.trip.startDate} – {state.trip.endDate}
            <Icon name="pin" className="sm" />
            {state.trip.destination}
          </div>
        </section>

        <CountdownCard state={countdown} schedule={state.schedule} destination={state.trip.destination} />

        {state.members.length > 0 && (
          <>
            <div className="sec-title"><Icon name="users" className="sm" /> 同行成员</div>
            <section className="card pad members-summary">
              <div className="avstack" aria-hidden="true">
                {state.members.slice(0, 4).map((member) => (
                  <div
                    className={`member-avatar tone-${((member.userId - 1) % 4) + 1}`}
                    key={member.userId}
                  >
                    {initial(member.displayName)}
                  </div>
                ))}
              </div>
              <div className="ms-main">
                <div className="ms-title">{state.members.length} 位朋友已加入</div>
                {readinessText && <div className="ms-sub">{readinessText}</div>}
              </div>
              <a className="btn btn-ghost sm" href="#/members">查看</a>
            </section>
          </>
        )}

        <MyPlanTimeline
          schedule={state.schedule}
          startDate={state.trip.startDate}
          isOrganizer={isOrganizer}
          onEditStop={state.plan ? openEdit : undefined}
          onDeleteStop={
            state.plan || state.schedule.some((item) => item.splitStep != null) ? removeStop : undefined
          }
          onAddStop={state.plan ? openAdd : undefined}
          busy={saving}
          destination={state.trip.destination}
        />
        {mutateError && !adding && (
          <p role="alert" className="error" style={{ marginTop: 8 }}>{mutateError}</p>
        )}
      </div>

      <Dialog
        open={editing != null}
        title="编辑站点"
        onClose={() => setEditing(null)}
        initialFocus={nameRef}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={saving} onClick={() => setEditing(null)}>
              取消
            </Button>
            <Button
              className="flex-1"
              disabled={saving || name.trim() === '' || start === '' || end === ''}
              onClick={saveStop}
            >
              {saving ? '保存中…' : '保存'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-2.5">
          <p className="text-[11.5px] text-ink-3">
            第 {editing?.seq} 站（可改名称、时间与备注；地图按名称导航，不改顺序与费用）
          </p>
          <label className="flex flex-col gap-1 text-[11.5px] text-ink-2">
            名称
            <input
              ref={nameRef}
              type="text"
              value={name}
              placeholder="站点名称"
              onChange={(event) => setName(event.target.value)}
              className="rounded-control border border-line bg-surface px-2 py-1.5 text-[13px] text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11.5px] text-ink-2">
            开始时间
            <input
              type="time"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              className="rounded-control border border-line bg-surface px-2 py-1.5 text-[13px] text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11.5px] text-ink-2">
            结束时间
            <input
              type="time"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              className="rounded-control border border-line bg-surface px-2 py-1.5 text-[13px] text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11.5px] text-ink-2">
            备注
            <input
              type="text"
              value={note}
              placeholder="这一站的备注（选填）"
              onChange={(event) => setNote(event.target.value)}
              className="rounded-control border border-line bg-surface px-2 py-1.5 text-[13px] text-ink"
            />
          </label>
          {saveError && <p role="alert" className="text-[11.5px] text-[#b91c1c]">{saveError}</p>}
        </div>
      </Dialog>

      <Dialog
        open={splitEditing != null}
        title="编辑分队节点"
        onClose={() => setSplitEditing(null)}
        initialFocus={splitNameRef}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={splitSaving} onClick={() => setSplitEditing(null)}>
              取消
            </Button>
            <Button
              className="flex-1"
              disabled={splitSaving || splitName.trim() === '' || splitMinutes === ''}
              onClick={saveSplitNode}
            >
              {splitSaving ? '保存中…' : '保存'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-2.5">
          <p className="text-[11.5px] text-ink-3">
            当前为分队节点：第 {splitEditing?.roundIndex} 轮 · {splitEditing?.groupLabel} 组；保存后会更新这一轮的路线与路线图。
          </p>
          <label className="flex flex-col gap-1 text-[11.5px] text-ink-2">
            名称
            <input
              ref={splitNameRef}
              type="text"
              value={splitName}
              placeholder="节点名称"
              onChange={(event) => setSplitName(event.target.value)}
              className="rounded-control border border-line bg-surface px-2 py-1.5 text-[13px] text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11.5px] text-ink-2">
            停留分钟
            <input
              type="number"
              min={0}
              value={splitMinutes}
              placeholder="停留分钟"
              onChange={(event) => setSplitMinutes(event.target.value)}
              className="rounded-control border border-line bg-surface px-2 py-1.5 text-[13px] text-ink"
            />
          </label>
          {splitError && <p role="alert" className="text-[11.5px] text-[#b91c1c]">{splitError}</p>}
        </div>
      </Dialog>

      <Dialog
        open={adding}
        title="添加节点"
        onClose={() => setAdding(false)}
        initialFocus={addNameRef}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={saving} onClick={() => setAdding(false)}>
              取消
            </Button>
            <Button
              className="flex-1"
              disabled={saving || newName.trim() === '' || newStart === '' || newEnd === ''}
              onClick={saveNewStop}
            >
              {saving ? '保存中…' : '添加'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-2.5">
          <p className="text-[11.5px] text-ink-3">新节点会追加到主线末尾，不能早于当前最后一站结束。</p>
          <label className="flex flex-col gap-1 text-[11.5px] text-ink-2">
            名称
            <input
              ref={addNameRef}
              type="text"
              value={newName}
              placeholder="站点名称"
              onChange={(event) => setNewName(event.target.value)}
              className="rounded-control border border-line bg-surface px-2 py-1.5 text-[13px] text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11.5px] text-ink-2">
            开始时间
            <input
              type="time"
              value={newStart}
              onChange={(event) => setNewStart(event.target.value)}
              className="rounded-control border border-line bg-surface px-2 py-1.5 text-[13px] text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11.5px] text-ink-2">
            结束时间
            <input
              type="time"
              value={newEnd}
              onChange={(event) => setNewEnd(event.target.value)}
              className="rounded-control border border-line bg-surface px-2 py-1.5 text-[13px] text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11.5px] text-ink-2">
            备注
            <input
              type="text"
              value={newNote}
              placeholder="这一站的备注（选填）"
              onChange={(event) => setNewNote(event.target.value)}
              className="rounded-control border border-line bg-surface px-2 py-1.5 text-[13px] text-ink"
            />
          </label>
          {mutateError && <p role="alert" className="text-[11.5px] text-[#b91c1c]">{mutateError}</p>}
        </div>
      </Dialog>
    </div>
  )
}