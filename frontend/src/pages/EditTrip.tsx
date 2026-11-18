import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { api, errorMessage } from '../api'
import Icon from '../Icons'
import ConfirmDialog from '../components/ui/confirm-dialog'
import type { Trip, TripCreatePayload } from '../types'
import { useAuth } from '../features/auth/AuthProvider'

interface EditTripProps {
  tripId: number
  backHref: string
}

type EditState =
  | { kind: 'loading' }
  | { kind: 'ready'; trip: Trip }
  | { kind: 'denied'; message?: string }
  | { kind: 'missing'; message?: string }
  | { kind: 'failed'; message: string | undefined }

function toPayload(trip: Trip): TripCreatePayload {
  return {
    name: trip.name,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    startLocation: trip.startLocation ?? '',
    endLocation: trip.endLocation ?? '',
  }
}

function planningChanged(trip: Trip, form: TripCreatePayload): boolean {
  return trip.destination !== form.destination
    || trip.startDate !== form.startDate
    || trip.endDate !== form.endDate
    || (trip.startLocation ?? '') !== form.startLocation
    || (trip.endLocation ?? '') !== form.endLocation
}

// US-003 (issue #60): full-form trip edit. Planning basics are member-writable, the
// name stays organizer-only, and a planning change warns about plan invalidation and
// an active/confirmed split before a single PUT is sent.
export default function EditTrip({ tripId, backHref }: EditTripProps) {
  const { account } = useAuth()
  const [state, setState] = useState<EditState>({ kind: 'loading' })
  const [form, setForm] = useState<TripCreatePayload | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dateError, setDateError] = useState(false)
  const [splitGate, setSplitGate] = useState(false)
  const [savePrompt, setSavePrompt] = useState<{ lines: string[]; form: TripCreatePayload } | null>(null)

  useEffect(() => {
    let active = true
    setState({ kind: 'loading' })
    api<Trip>(`/api/trips/${tripId}`)
      .then((result) => {
        if (!active) return
        if (result.ok && result.data) {
          setState({ kind: 'ready', trip: result.data })
          setForm(toPayload(result.data))
        } else if (!result.ok && result.status === 403) {
          setState({ kind: 'denied', message: result.data?.message })
        } else if (!result.ok && result.status === 404) {
          setState({ kind: 'missing', message: result.data?.message })
        } else {
          const message = result.ok ? undefined : result.data?.message
          setState({ kind: 'failed', message: message ?? `HTTP ${result.status}` })
        }
      })
      .catch((cause: unknown) => {
        if (active) setState({ kind: 'failed', message: errorMessage(cause) })
      })
    return () => {
      active = false
    }
  }, [tripId])

  const set = (field: keyof TripCreatePayload) => (event: ChangeEvent<HTMLInputElement>) => {
    if (!form) return
    const next = { ...form, [field]: event.target.value }
    setForm(next)
    if (next.startDate && next.endDate) {
      setDateError(next.startDate > next.endDate)
    } else {
      setDateError(false)
    }
    setError('')
    setSplitGate(false)
  }

  async function planExists(): Promise<boolean> {
    const result = await api<unknown>(`/api/trips/${tripId}/main-plan`)
    return result.ok
  }

  async function splitInProgress(): Promise<boolean> {
    const result = await api<{ status?: string } | null>(`/api/trips/${tripId}/split-draft`)
    if (!result.ok || !result.data) return false
    return result.data.status === 'active' || result.data.status === 'confirmed'
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form || state.kind !== 'ready' || dateError) return
    const planning = planningChanged(state.trip, form)
    if (planning) {
      const [hasPlan, hasSplit] = await Promise.all([planExists(), splitInProgress()])
      const lines = [
        '修改目的地 / 日期 / 起终点会让现有主线方案过期，需要重新生成；已确认的方案需要重新确认。',
      ]
      if (hasPlan) {
        lines.push('保存后主线草稿会标记为过期或退回待生成。')
      }
      if (hasSplit) {
        lines.push('当前有进行中的分队，需要先在分队页取消后才能保存规划修改。')
      }
      setSavePrompt({ lines, form })
      return
    }
    await persist(form)
  }

  async function persist(form: TripCreatePayload) {
    setBusy(true)
    setError('')
    setSplitGate(false)
    try {
      const result = await api<Trip>(`/api/trips/${tripId}`, { method: 'PUT', body: form })
      if (result.ok) {
        window.location.hash = `#/trips/${tripId}`
        return
      }
      const data = result.ok ? null : result.data
      if (data?.code === 'SPLIT_DRAFT_ACTIVE' || data?.code === 'SPLIT_CONFIRMED') {
        setSplitGate(true)
        setError('当前有进行中的分队，需要先在分队页取消后才能修改规划信息。')
      } else {
        setError(data?.message ? `${data.code}: ${data.message}` : `保存失败（HTTP ${result.status}）`)
      }
    } catch (cause: unknown) {
      setError(`无法连接服务器：${errorMessage(cause)}`)
    } finally {
      setBusy(false)
    }
  }

  const appbar = (
    <header className="appbar">
      <a className="iconbtn" href={`#/trips/${tripId}`} aria-label="Back"><Icon name="left" /></a>
      <div className="grow">
        <div className="title">编辑行程信息</div>
        <div className="sub">US-003 · 规划字段所有成员可改，名称仅组织者</div>
      </div>
    </header>
  )

  if (state.kind === 'loading') {
    return (
      <div className="screen">
        {appbar}
        <div className="body"><div className="loading">正在加载行程…</div></div>
      </div>
    )
  }

  if (state.kind !== 'ready') {
    const heading =
      state.kind === 'denied' ? '没有访问权限'
        : state.kind === 'missing' ? '行程不存在'
          : '无法加载行程'
    const explanation =
      state.kind === 'denied' ? '你不是这个行程的成员，不能编辑行程信息。'
        : state.kind === 'missing' ? '没有这个行程，或链接中的编号不正确。'
          : state.message
    return (
      <div className="screen">
        {appbar}
        <div className="body">
          <section className="card pad">
            <div className="success-hero" style={{ paddingTop: 10 }}>
              <div className="checkring err"><Icon name="alert" className="lg" /></div>
              <h2>{heading}</h2>
              <p className="hint">{explanation}</p>
            </div>
            {state.kind === 'failed' && (
              <button className="btn btn-ghost" type="button" onClick={() => window.location.reload()}>重试</button>
            )}
            <a className="btn btn-ghost" href={backHref}>返回行程</a>
          </section>
        </div>
      </div>
    )
  }

  const trip = state.trip
  const isOrganizer = trip.organizerId === account?.id
  const current = form ?? toPayload(trip)

  return (
    <div className="screen">
      {appbar}
      <form className="screen" onSubmit={submit}>
        <div className="body">
          <div className="field">
            <label className="label" htmlFor="edit-trip-name">
              <Icon name="edit" className="sm" /> 行程名称
              {!isOrganizer && <span className="opt">仅组织者可改</span>}
            </label>
            <input
              id="edit-trip-name"
              className="input"
              value={current.name}
              onChange={set('name')}
              readOnly={!isOrganizer}
              aria-readonly={!isOrganizer}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="edit-trip-destination">
              <Icon name="pin" className="sm" /> 目的地
            </label>
            <div className="inp-ic">
              <Icon name="pin" />
              <input
                id="edit-trip-destination"
                className="input"
                value={current.destination}
                onChange={set('destination')}
                placeholder="城市 / 景区"
              />
            </div>
          </div>

          <div className="two">
            <div className="field">
              <label className="label" htmlFor="edit-trip-start">
                <Icon name="cal" className="sm" /> 开始日期
              </label>
              <input
                id="edit-trip-start"
                className="input"
                type="date"
                value={current.startDate}
                onChange={set('startDate')}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="edit-trip-end">结束日期</label>
              <input
                id="edit-trip-end"
                className={`input${dateError ? ' invalid' : ''}`}
                type="date"
                value={current.endDate}
                onChange={set('endDate')}
              />
              {dateError && (
                <div className="err-msg">
                  <Icon name="alert" className="sm" /> 结束日期不能早于开始日期
                </div>
              )}
            </div>
          </div>

          <div className="two">
            <div className="field">
              <label className="label" htmlFor="edit-trip-from">
                <Icon name="nav" className="sm" /> 出发地
                <span className="opt">可选</span>
              </label>
              <input
                id="edit-trip-from"
                className="input"
                value={current.startLocation}
                onChange={set('startLocation')}
                placeholder="留空表示未设置"
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="edit-trip-to">
                <Icon name="flag" className="sm" /> 返程地
                <span className="opt">可选</span>
              </label>
              <input
                id="edit-trip-to"
                className="input"
                value={current.endLocation}
                onChange={set('endLocation')}
                placeholder="留空表示未设置"
              />
            </div>
          </div>

          <div className="info-note">
            <Icon name="info" className="sm" />
            <p className="hint">
              所有成员都可以修改目的地、日期与起终点；行程名称只有组织者可以改。
              规划信息变化会让现有主线方案过期或需要重新生成。
            </p>
          </div>

          {error && (
            <div role="alert" className="error" style={{ marginTop: 12 }}>
              {error}
              {splitGate && (
                <div style={{ marginTop: 8 }}>
                  <a className="btn btn-ghost" href={`/trips/${tripId}/split`}>去分队页处理</a>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="actionbar">
          <button className="btn btn-primary" type="submit" disabled={busy || dateError}>
            <Icon name="check" className="sm" />
            {busy ? '正在保存…' : '保存修改'}
          </button>
        </div>
      </form>
      <ConfirmDialog
        open={savePrompt != null}
        title="保存规划修改？"
        lines={savePrompt?.lines ?? []}
        confirmLabel="继续保存"
        cancelLabel="取消"
        tone="warn"
        onConfirm={() => {
          const pending = savePrompt
          setSavePrompt(null)
          if (pending) void persist(pending.form)
        }}
        onCancel={() => setSavePrompt(null)}
      />
    </div>
  )
}
