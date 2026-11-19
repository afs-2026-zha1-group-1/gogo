import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../features/auth/AuthProvider'
import Icon from '../Icons'
import ConfirmDialog from '../components/ui/confirm-dialog'
import StopMapButton from '../components/StopMapButton'
import { AiGeneratingNotice } from '../components/AiGeneratingNotice'
import { completeStopLocations } from '../lib/stop-locations'
import { dayLabel, groupByDay } from '../lib/day-groups'
import type {
  BudgetOverrun,
  MainPlan,
  MainPlanError,
  PlanStop,
  ScheduleError,
  TripSummary,
} from '../types/mainPlan'

// Screen 10 (US-037, design D11): draft review and validation-gated confirm.
// Members can generate drafts; only the organizer confirms them.
// Blocked confirms render both error lists from the 422 detail payload.
const ERROR_LABELS: Record<string, string> = {
  OUT_OF_ORDER: '时间顺序冲突',
  OVERLAP: '时间重叠',
  MISSING_LEG: '缺少路程时间',
  TRAVEL_EXCEEDS_GAP: '路程超出空档',
  OUT_OF_DAY: '超出一日时间窗',
}

// Per-person cost is stored in the destination's currency (cents); the symbol follows the trip.
function money(cents: number, destination?: string | null) {
  const value = destination ?? ''
  const symbol = /香港|hong\s*kong/i.test(value)
    ? 'HK$'
    : /伦敦|london/i.test(value)
      ? '£'
      : /合肥|hefei|珠海|zhuhai/i.test(value)
        ? '¥'
        : 'S$'
  return `${symbol}${cents / 100}`
}

function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : String(cause)
}

type PlanState =
  | { kind: 'loading' }
  | { kind: 'ready'; trip: TripSummary; plan: MainPlan }
  | { kind: 'empty'; trip: TripSummary }
  | { kind: 'denied'; message?: string }
  | { kind: 'missing'; message?: string }
  | { kind: 'failed'; message: string }

interface BlockedConfirm {
  scheduleErrors: ScheduleError[]
  overruns: BudgetOverrun[]
}

interface MainPlanProps {
  tripId: number
  dashboardOrigin?: boolean
}

export default function MainPlan({ tripId, dashboardOrigin = false }: MainPlanProps) {
  const { account } = useAuth()
  const [state, setState] = useState<PlanState>({ kind: 'loading' })
  const [busy, setBusy] = useState<'regen' | 'confirm' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<BlockedConfirm | null>(null)
  const [editingStopId, setEditingStopId] = useState<number | null>(null)
  const [stopForm, setStopForm] = useState({ name: '', startTime: '', endTime: '' })
  const [stopBusy, setStopBusy] = useState(false)
  const [stopError, setStopError] = useState<string | null>(null)
  const [stalePrompt, setStalePrompt] = useState(false)
  // US-079 路线1：每个草稿版本只尝试一次坐标补全，避免海外站查不到时反复重试。
  const completionTried = useRef<string | null>(null)

  const load = useCallback(() => {
    let active = true
    setState({ kind: 'loading' })
    setActionError(null)
    setBlocked(null)
    Promise.all([
      api<TripSummary>(`/api/trips/${tripId}`),
      api<MainPlan & MainPlanError>(`/api/trips/${tripId}/main-plan`),
    ])
      .then(([tripResult, planResult]) => {
        if (!active) return
        if (tripResult.status === 403 || planResult.status === 403) {
          setState({ kind: 'denied', message: planResult.data?.message ?? tripResult.data?.message })
        } else if (tripResult.status === 404) {
          setState({ kind: 'missing', message: tripResult.data?.message })
        } else if (tripResult.ok && tripResult.data) {
          if (planResult.ok && planResult.data) {
            setState({ kind: 'ready', trip: tripResult.data, plan: planResult.data })
          } else if (planResult.status === 404 && planResult.data?.code === 'NO_DRAFT') {
            setState({ kind: 'empty', trip: tripResult.data })
          } else {
            setState({ kind: 'failed', message: planResult.data?.message ?? `HTTP ${planResult.status}` })
          }
        } else {
          setState({ kind: 'failed', message: tripResult.data?.message ?? `HTTP ${tripResult.status}` })
        }
      })
      .catch((cause: unknown) => {
        if (active) setState({ kind: 'failed', message: errorMessage(cause) })
      })
    return () => {
      active = false
    }
  }, [tripId])

  useEffect(() => load(), [load])

  // US-079 路线1：AI 生成的站只有名字没有坐标，进页/重新生成后异步查坐标回写，
  // 成功后刷新方案让“高德”按钮带上起终点坐标开路线页。仅组织者草稿态可调。
  useEffect(() => {
    if (state.kind !== 'ready') return
    const { trip, plan } = state
    if (trip.organizerId !== account?.id || plan.confirmed) return
    if (!plan.stops.some((stop) => stop.lat == null || stop.lng == null || !stop.address?.trim())) return
    const key = `${tripId}:${plan.version}`
    if (completionTried.current === key) return
    completionTried.current = key
    void completeStopLocations(tripId, plan.stops, trip.destination)
      .then((updated) => { if (updated) return refreshPlan() })
      .catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, account?.id, tripId])

  async function refreshPlan() {
    const { ok, data } = await api<MainPlan>(`/api/trips/${tripId}/main-plan`)
    if (ok && data) {
      setState((current) => current.kind === 'ready' ? { ...current, plan: data } : current)
    }
  }

  async function regenerate() {
    setBusy('regen')
    setActionError(null)
    setBlocked(null)
    try {
      const { status, ok, data } = await api<MainPlan & MainPlanError>(`/api/trips/${tripId}/main-plan`, { method: 'POST' })
      if (ok && data) {
        setState((current) => current.kind === 'ready' ? { ...current, plan: data } : current)
      } else if (status === 409 && data?.code === 'MEMBERS_NOT_READY') {
        const names = (data.pendingMembers ?? []).map((member) => member.displayName).join('、')
        setActionError(`还有成员未就绪：${names}。请等所有成员提交偏好后再试。`)
      } else {
        setActionError(data?.message ? `${data.code}: ${data.message}` : `重新生成失败（HTTP ${status}）`)
      }
    } catch (cause) {
      setActionError(`无法连接服务器：${errorMessage(cause)}`)
    } finally {
      setBusy(null)
    }
  }

  async function confirm() {
    // US-003 D15: a stale draft gets a blocking prompt; cancelling sends no confirm.
    if (state.kind === 'ready' && state.plan.stale) {
      setStalePrompt(true)
      return
    }
    setBusy('confirm')
    setActionError(null)
    setBlocked(null)
    try {
      const { status, ok, data } = await api<MainPlan & MainPlanError>(`/api/trips/${tripId}/main-plan/confirm`, { method: 'POST' })
      if (ok && data) {
        setState((current) => current.kind === 'ready' ? { ...current, plan: data } : current)
      } else if (status === 422 && data?.code === 'VALIDATION_FAILED') {
        setBlocked({
          scheduleErrors: data.scheduleErrors ?? [],
          overruns: data.overruns ?? [],
        })
      } else if (status === 409 && data?.code === 'STALE_DRAFT') {
        setActionError(data.message ?? 'The draft is stale and the latest version was refreshed.')
        await refreshPlan()
      } else if (status === 409 && data?.code === 'ALREADY_CONFIRMED') {
        await refreshPlan()
      } else {
        setActionError(data?.message ? `${data.code}: ${data.message}` : `确认失败（HTTP ${status}）`)
      }
    } catch (cause) {
      setActionError(`无法连接服务器：${errorMessage(cause)}`)
    } finally {
      setBusy(null)
    }
  }

  function beginStopEdit(stop: PlanStop) {
    setEditingStopId(stop.id ?? null)
    setStopForm({ name: stop.name, startTime: stop.startTime, endTime: stop.endTime })
    setStopError(null)
  }

  async function saveStop() {
    if (editingStopId == null || state.kind !== 'ready') return
    setStopBusy(true)
    setStopError(null)
    try {
      const { ok, status, data } = await api<MainPlan & MainPlanError>(
        `/api/trips/${tripId}/main-plan/stops/${editingStopId}`,
        { method: 'PUT', body: { ...stopForm, mainPlanVersion: state.plan.version } },
      )
      if (ok && data) {
        setState((current) => current.kind === 'ready' ? { ...current, plan: data } : current)
        setEditingStopId(null)
      } else if (status === 409 && data?.code === 'ALREADY_CONFIRMED') {
        setStopError('主线方案已确认，不能再编辑。')
        await refreshPlan()
      } else {
        setStopError(data?.message ? `${data.code}: ${data.message}` : `保存失败（HTTP ${status}）`)
      }
    } catch (cause) {
      setStopError(`无法连接服务器：${errorMessage(cause)}`)
    } finally {
      setStopBusy(false)
    }
  }

  const inTrip = state.kind === 'ready' || state.kind === 'empty'
  const appbar = (
    <header className="appbar">
      <a className="iconbtn" href={dashboardOrigin ? `#/dashboard/trips/${tripId}` : `#/trips/${tripId}`} aria-label="Back"><Icon name="left" /></a>
      <div className="grow">
        <div className="title">主线方案</div>
        <div className="sub">校验通过后方可确认</div>
      </div>
      {state.kind === 'ready' && (
        <span className={state.plan.confirmed ? 'pill ok' : 'pill warn'}>
          {state.plan.confirmed ? '已确认' : '草稿'} v{state.plan.version}
        </span>
      )}
      {inTrip && !dashboardOrigin && (
        <a className="iconbtn" href={`#/trips/${tripId}`} aria-label="行程详情"><Icon name="info" /></a>
      )}
      {inTrip && dashboardOrigin && <span className="hint">行程详情即将推出</span>}
    </header>
  )

  if (state.kind === 'loading') {
    return (
      <div className="screen">
        {appbar}
        <div className="body"><div className="loading">正在加载主线方案…</div></div>
      </div>
    )
  }

  if (state.kind === 'empty') {
    return (
      <div className="screen">
        {appbar}
        <div className="body">
          <section className="card pad">
            <div className="success-hero" style={{ paddingTop: 10 }}>
              <div className="checkring"><Icon name="cal" className="lg" /></div>
              <h2>还没有主线方案</h2>
              <p className="hint">
                全员就绪后，即可基于成员偏好生成主线方案草稿。
              </p>
            </div>
            <a className="btn btn-primary" href={dashboardOrigin
                ? `#/dashboard/trips/${tripId}/main-plan/inputs`
                : `#/trips/${tripId}/main-plan/inputs`}>
                <Icon name="sparkle" className="sm" /> 去生成主线方案
            </a>
          </section>
        </div>
      </div>
    )
  }

  if (state.kind !== 'ready') {
    const heading =
      state.kind === 'denied' ? '没有访问权限'
        : state.kind === 'missing' ? '行程不存在'
          : '无法加载主线方案'
    const explanation =
      state.kind === 'denied' ? '你不是这个行程的成员，看不到主线方案。'
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
              <button className="btn btn-ghost" type="button" onClick={load}>重试</button>
            )}
            <a className="btn btn-ghost" href="#/" style={{ marginTop: 8 }}>返回首页</a>
          </section>
        </div>
      </div>
    )
  }

  const { trip, plan } = state
  const isOrganizer = trip.organizerId === account?.id
  // 导航端点映射：PlanStop 的 lng 对应 ScheduleItem/MapStop 的 lon。
  const mapStop = (stop: PlanStop) => ({
    name: stop.name,
    address: stop.address ?? null,
    lat: stop.lat ?? null,
    lon: stop.lng ?? null,
  })
  const dayGroups = groupByDay(plan.stops, (stop) => stop.dayIndex ?? 1)

  return (
    <div className="screen">
      {appbar}
      <div className="body">
        {plan.confirmed ? (
          <section className="card pad" style={{ background: 'var(--ok-soft)', borderColor: '#a7f3d0' }}>
            <div className="valid-item" style={{ borderBottom: 0 }}>
              <span className="valid-ic brand"><Icon name="lock" className="sm" /></span>
              <div>
                <div className="vt">主线方案已确认 · 不能再重新生成</div>
                <div className="vd">这是全员共享的冻结版本，加入已关闭。下一步只能进入智能分队。</div>
              </div>
            </div>
          </section>
        ) : (
          <section className="card pad" style={{ background: 'var(--surface-2)' }}>
            <p className="tiny muted">
              基于当前就绪偏好生成。若成员偏好变更，此草稿会标记为<b>过期</b>，需重新生成。
            </p>
          </section>
        )}

        {plan.stale && !plan.confirmed && (
          <section className="banner-warn" role="alert" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warn)' }}>
              <Icon name="alert" className="sm" /> 此草稿已过期
            </div>
            <p className="tiny" style={{ color: 'var(--warn)', marginTop: 4 }}>
              行程信息或成员偏好已变化。请重新生成后再确认。
            </p>
          </section>
        )}

        {dayGroups.map((group) => (
          <section className="day-group" key={group.dayIndex}>
            <div className="sec-title day-tag"><Icon name="clock" className="sm" /> {dayLabel(trip.startDate, group.dayIndex)}</div>
            <div className="timeline">
              {group.items.map((stop, index) => (
            <div className="tl-item" key={stop.seq}>
              <div className="tl-rail">
                <div className="tl-node" />
                {index < plan.stops.length - 1 && <div className="tl-line" />}
              </div>
              <div className="tl-card">
                <div className="tl-time">{stop.startTime} – {stop.endTime}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3 }}>{stop.name}</div>
                {stop.interests.length > 0 && (
                  <div className="chips" style={{ marginTop: 6 }}>
                    {stop.interests.map((tag) => <span className="pill" key={tag}>{tag}</span>)}
                  </div>
                )}
                {stop.travelMinutesToNext != null && (
                  <div className="tl-leg">
                    <Icon name="nav" className="sm" /> 前往下一站 · {stop.travelMinutesToNext} 分钟
                  </div>
                )}
                <StopMapButton
                  item={mapStop(stop)}
                  destination={trip.destination}
                  from={index > 0 ? mapStop(group.items[index - 1]) : null}
                  showCopy={false}
                />
                {isOrganizer && !plan.confirmed && (
                  editingStopId === stop.id ? (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <input
                        className="input"
                        value={stopForm.name}
                        onChange={(event) => setStopForm({ ...stopForm, name: event.target.value })}
                        aria-label="活动地点名称"
                      />
                      <div className="two">
                        <input
                          className="input"
                          value={stopForm.startTime}
                          onChange={(event) => setStopForm({ ...stopForm, startTime: event.target.value })}
                          placeholder="09:00"
                          aria-label="开始时间"
                        />
                        <input
                          className="input"
                          value={stopForm.endTime}
                          onChange={(event) => setStopForm({ ...stopForm, endTime: event.target.value })}
                          placeholder="09:30"
                          aria-label="结束时间"
                        />
                      </div>
                      {stopError && <p role="alert" className="error">{stopError}</p>}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary" type="button" disabled={stopBusy} onClick={saveStop}>
                          {stopBusy ? '保存中…' : '保存'}
                        </button>
                        <button
                          className="btn btn-ghost"
                          type="button"
                          disabled={stopBusy}
                          onClick={() => { setEditingStopId(null); setStopError(null) }}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn btn-ghost" type="button" style={{ marginTop: 8 }} onClick={() => beginStopEdit(stop)}>
                      <Icon name="edit" className="sm" /> 编辑地点与时间
                    </button>
                  )
                )}
              </div>
            </div>
              ))}
            </div>
          </section>
        ))}

        <section className="card pad" style={{ marginTop: 12 }}>
          <div className="valid-item" style={{ borderBottom: 0 }}>
            <span className="valid-ic"><Icon name="shield" className="sm" /></span>
            <div>
              <div className="vt">人均费用 {money(plan.costPerPersonCents, trip.destination)}</div>
              <div className="vd">版本 v{plan.version} · {plan.confirmed ? '已确认，全员共享' : '草稿，待组织者确认'}</div>
            </div>
          </div>
        </section>

        {blocked && (
          <section className="card pad" role="alert" style={{ marginTop: 12, borderColor: '#fecaca', background: 'var(--err-soft)' }}>
            <div className="label" style={{ color: 'var(--err)', marginBottom: 8 }}>确认被拦截：请先修复以下问题</div>
            {blocked.scheduleErrors.length > 0 && (
              <div className="valid">
                {blocked.scheduleErrors.map((error, index) => (
                  <div className="valid-item" key={`${error.type}-${error.seq}-${index}`}>
                    <span className="valid-ic" style={{ background: '#fff', color: 'var(--err)' }}>
                      <Icon name="alert" className="sm" />
                    </span>
                    <div>
                      <div className="vt">第 {error.seq} 站 · {ERROR_LABELS[error.type] ?? error.type}（{error.type}）</div>
                      <div className="vd">{error.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {blocked.overruns.length > 0 && (
              <div className="valid" style={{ marginTop: 8 }}>
                {blocked.overruns.map((overrun) => (
                  <div className="valid-item" key={overrun.userId}>
                    <span className="valid-ic" style={{ background: '#fff', color: 'var(--err)' }}>
                      <Icon name="shield" className="sm" />
                    </span>
                    <div>
                      <div className="vt">{overrun.displayName} 超出硬预算</div>
                      <div className="vd">
                        硬预算 {money(overrun.hardBudgetCents, trip.destination)} · 人均费用 {money(plan.costPerPersonCents, trip.destination)} · 超出 {money(overrun.overrunCents, trip.destination)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {actionError && <p role="alert" className="error" style={{ marginTop: 12 }}>{actionError}</p>}

        {!plan.confirmed && (
          <p className="tiny muted" style={{ marginTop: 12 }}>
            重新生成会整份替换草稿，并丢弃手动修改的活动地点与时间。
          </p>
        )}

        {!isOrganizer && !plan.confirmed && (
          <p className="hint" style={{ marginTop: 12 }}>
            你可以审阅或重新生成草稿；确认由组织者操作。
          </p>
        )}
      </div>

      {plan.confirmed ? (
        <div className="actionbar" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {isOrganizer && (
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => { window.location.href = `/trips/${tripId}/split${dashboardOrigin ? '?from=dashboard' : ''}` }}
            >
              <Icon name="fork" className="sm" /> 进入智能分队
            </button>
          )}
          {/* US-090: the confirmed plan gets a second exit back to the trip for every member. */}
          <a
            className="btn btn-ghost"
            href={dashboardOrigin ? `#/dashboard/trips/${tripId}` : `#/trips/${tripId}`}
          >
            <Icon name="left" className="sm" /> 返回行程
          </a>
          {!isOrganizer && (
            <p className="hint" style={{ textAlign: 'center' }}>
              主线方案已确认，等待组织者发起智能分队。
            </p>
          )}
        </div>
      ) : (
        <>
          {busy === 'regen' && <AiGeneratingNotice />}
          <div className="actionbar" style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-ghost"
            type="button"
            style={{ flex: 1 }}
            disabled={busy !== null}
            onClick={regenerate}
          >
            <Icon name="sparkle" className="sm" /> {busy === 'regen' ? '正在生成…' : '重新生成'}
          </button>
          {isOrganizer && <button
            className="btn btn-primary"
            type="button"
            style={{ flex: 1.4 }}
            disabled={busy !== null}
            onClick={confirm}
          >
            <Icon name="lock" className="sm" /> {busy === 'confirm' ? '正在校验…' : '确认主线方案'}
          </button>}
          </div>
        </>
      )}

      <ConfirmDialog
        open={stalePrompt}
        title="方案已过期"
        lines={[
          '行程信息或成员偏好已变化，当前草稿不能直接确认。',
          '请重新生成后再确认；重新生成会整份替换草稿，并丢弃手动修改的活动地点与时间。',
        ]}
        confirmLabel="立即重新生成"
        cancelLabel="取消"
        tone="warn"
        onConfirm={() => {
          setStalePrompt(false)
          void regenerate()
        }}
        onCancel={() => setStalePrompt(false)}
      />
    </div>
  )
}