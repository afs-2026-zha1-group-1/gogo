import { useRef, useState } from 'react'
import Icon from '../Icons'
import CountdownCard from './CountdownCard'
import MyPlanTimeline from './MyPlanTimeline'
import { Button } from './ui/button'
import { Dialog } from './ui/dialog'
import { api } from '../api'
import { useCountdown } from '../hooks/useCountdown'
import { localEndOfDay, localMidnight, type ScheduleItem } from '../lib/countdown'
import { useAuth } from '../features/auth/AuthProvider'
import type { TripOverviewState } from '../hooks/useTripOverview'
import type { MainPlan, PlanStop } from '../types/mainPlan'

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

/** One readable line for a rejected stop mutation (code plus message, or the HTTP status). */
function apiFailure(result: { status: number; ok: boolean; data: unknown }): string {
  if (!result.ok) {
    const error = result.data as { code?: string; message?: string } | null
    if (error?.message) return error.code ? `${error.code}: ${error.message}` : error.message
  }
  return `操作失败（HTTP ${result.status}）`
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
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const startRef = useRef<HTMLInputElement>(null)

  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newStart, setNewStart] = useState('09:00')
  const [newEnd, setNewEnd] = useState('10:00')
  const [newLocation, setNewLocation] = useState('')
  const [mutateError, setMutateError] = useState<string | null>(null)
  const addNameRef = useRef<HTMLInputElement>(null)

  // US-090: only main-plan stops carry a stopId, so a confirmed personal route stays read-only.
  function openEdit(item: ScheduleItem) {
    if (item.stopId == null || state.plan == null) return
    const stop = state.plan.stops.find((candidate) => candidate.id === item.stopId)
    if (!stop) return
    setEditing(stop)
    setStart(stop.startTime)
    setEnd(stop.endTime)
    setLocation(stop.locationName ?? '')
    setSaveError(null)
  }

  async function saveStop() {
    if (editing == null || editing.id == null || state.plan == null) return
    setSaving(true)
    setSaveError(null)
    try {
      const result = await api<MainPlan>(`/api/trips/${state.trip.id}/main-plan/stops/${editing.id}`, {
        method: 'PUT',
        body: { startTime: start, endTime: end, locationName: location, mainPlanVersion: state.plan.version },
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
    setNewLocation('')
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
          locationName: newLocation,
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

        <CountdownCard state={countdown} schedule={state.schedule} />

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
          onDeleteStop={state.plan && state.plan.stops.length > 1 ? removeStop : undefined}
          onAddStop={state.plan ? openAdd : undefined}
          busy={saving}
        />
        {mutateError && !adding && (
          <p role="alert" className="error" style={{ marginTop: 8 }}>{mutateError}</p>
        )}
      </div>

      <Dialog
        open={editing != null}
        title="编辑站点"
        onClose={() => setEditing(null)}
        initialFocus={startRef}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={saving} onClick={() => setEditing(null)}>
              取消
            </Button>
            <Button className="flex-1" disabled={saving || start === '' || end === ''} onClick={saveStop}>
              {saving ? '保存中…' : '保存'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-2.5">
          <p className="text-[11.5px] text-ink-3">
            {editing?.name} · 第 {editing?.seq} 站（只改开始/结束时间与地点，不改站名、顺序与费用）
          </p>
          <label className="flex flex-col gap-1 text-[11.5px] text-ink-2">
            开始时间
            <input
              ref={startRef}
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
            地点
            <input
              type="text"
              value={location}
              placeholder="这一站的地点"
              onChange={(event) => setLocation(event.target.value)}
              className="rounded-control border border-line bg-surface px-2 py-1.5 text-[13px] text-ink"
            />
          </label>
          {saveError && <p role="alert" className="text-[11.5px] text-[#b91c1c]">{saveError}</p>}
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
            地点
            <input
              type="text"
              value={newLocation}
              placeholder="这一站的地点"
              onChange={(event) => setNewLocation(event.target.value)}
              className="rounded-control border border-line bg-surface px-2 py-1.5 text-[13px] text-ink"
            />
          </label>
          {mutateError && <p role="alert" className="text-[11.5px] text-[#b91c1c]">{mutateError}</p>}
        </div>
      </Dialog>
    </div>
  )
}