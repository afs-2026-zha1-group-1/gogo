import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../features/auth/AuthProvider'
import Icon from '../Icons'
import type {
  BudgetOverrun,
  MainPlan,
  MainPlanError,
  ScheduleError,
  TripSummary,
} from '../types/mainPlan'

// Screen 10 (US-037, design D11): draft review and validation-gated confirm.
// Members read the shared timeline; only the organizer regenerates/confirms.
// Blocked confirms render both error lists from the 422 detail payload.
const ERROR_LABELS: Record<string, string> = {
  OUT_OF_ORDER: '时间顺序冲突',
  OVERLAP: '时间重叠',
  MISSING_LEG: '缺少路程时间',
  TRAVEL_EXCEEDS_GAP: '路程超出空档',
  OUT_OF_DAY: '超出一日时间窗',
}

function sgd(cents: number) {
  return `S$${cents / 100}`
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
}

export default function MainPlan({ tripId }: MainPlanProps) {
  const { account } = useAuth()
  const [state, setState] = useState<PlanState>({ kind: 'loading' })
  const [busy, setBusy] = useState<'regen' | 'confirm' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<BlockedConfirm | null>(null)

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

  const appbar = (
    <header className="appbar">
      <a className="iconbtn" href={`#/trips/${tripId}`} aria-label="Back"><Icon name="left" /></a>
      <div className="grow">
        <div className="title">主线方案</div>
        <div className="sub">US-037 · 校验通过后方可确认</div>
      </div>
      {state.kind === 'ready' && (
        <span className={state.plan.confirmed ? 'pill ok' : 'pill warn'}>
          {state.plan.confirmed ? '已确认' : '草稿'} v{state.plan.version}
        </span>
      )}
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
    const isOrganizer = state.trip.organizerId === account?.id
    return (
      <div className="screen">
        {appbar}
        <div className="body">
          <section className="card pad">
            <div className="success-hero" style={{ paddingTop: 10 }}>
              <div className="checkring"><Icon name="cal" className="lg" /></div>
              <h2>还没有主线方案</h2>
              <p className="hint">
                {isOrganizer
                  ? '全员就绪后，即可基于成员偏好生成主线方案草稿。'
                  : '组织者还没有生成主线方案。生成后你可以在这里审阅。'}
              </p>
            </div>
            {isOrganizer && (
              <a className="btn btn-primary" href={`#/trips/${tripId}/main-plan/inputs`}>
                <Icon name="nav" className="sm" /> 去生成主线方案
              </a>
            )}
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

  return (
    <div className="screen">
      {appbar}
      <div className="body">
        {plan.confirmed ? (
          <section className="card pad" style={{ background: 'var(--ok-soft)', borderColor: '#a7f3d0' }}>
            <div className="valid-item" style={{ borderBottom: 0 }}>
              <span className="valid-ic brand"><Icon name="check" className="sm" /></span>
              <div>
                <div className="vt">主线方案已确认 · 加入已关闭</div>
                <div className="vd">这是全员共享的冻结版本，新成员不能再通过邀请链接加入。</div>
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
              有成员的偏好修订号发生了变化。请重新生成后再确认。
            </p>
          </section>
        )}

        <div className="sec-title"><Icon name="cal" className="sm" /> Day 1 · {trip.startDate}</div>
        <div className="timeline">
          {plan.stops.map((stop, index) => (
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
              </div>
            </div>
          ))}
        </div>

        <section className="card pad" style={{ marginTop: 12 }}>
          <div className="valid-item" style={{ borderBottom: 0 }}>
            <span className="valid-ic"><Icon name="shield" className="sm" /></span>
            <div>
              <div className="vt">人均费用 {sgd(plan.costPerPersonCents)}</div>
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
                        硬预算 {sgd(overrun.hardBudgetCents)} · 人均费用 {sgd(plan.costPerPersonCents)} · 超出 {sgd(overrun.overrunCents)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {actionError && <p role="alert" className="error" style={{ marginTop: 12 }}>{actionError}</p>}

        {!isOrganizer && !plan.confirmed && (
          <p className="hint" style={{ marginTop: 12 }}>
            你可以审阅草稿；确认与重新生成由组织者操作。
          </p>
        )}
      </div>

      {isOrganizer && !plan.confirmed && (
        <div className="actionbar" style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-ghost"
            type="button"
            style={{ flex: 1 }}
            disabled={busy !== null}
            onClick={regenerate}
          >
            <Icon name="nav" className="sm" /> {busy === 'regen' ? '正在生成…' : '重新生成'}
          </button>
          <button
            className="btn btn-primary"
            type="button"
            style={{ flex: 1.4 }}
            disabled={busy !== null}
            onClick={confirm}
          >
            <Icon name="check" className="sm" /> {busy === 'confirm' ? '正在校验…' : '确认主线方案'}
          </button>
        </div>
      )}
    </div>
  )
}