import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../features/auth/AuthProvider'
import Icon from '../Icons'
import { geocodeAddress } from '../lib/amap-geocode'
import { INTEREST_OPTIONS } from '../types/preferences'
import type { MainPlan, MainPlanError, MainPlanInputs, TripSummary } from '../types/mainPlan'

// Screen 9 (US-031, design D11): generation inputs summary. Members read,
// only the organizer sees the generate action. Display wording is free per
// the fixtures ruling; the six rule identifiers come from the API.
const RULE_TEXT: Record<string, { title: string; detail: string }> = {
  ALL_MEMBERS_READY: { title: '全员就绪才生成', detail: '只采用已提交的成员；沉默不算同意' },
  SUPPLIED_ACTIVITY_TIMES: { title: '必做项优先', detail: '先排入全员必做项与固定时间' },
  TRAVEL_LEGS_BETWEEN_STOPS: { title: '站点之间留出路程', detail: '相邻站点之间保留交通时间' },
  HARD_BUDGET_RESPECTED: { title: '硬预算过滤', detail: '剔除会让成员超过硬上限的活动' },
  STALE_DRAFT_BLOCKS_CONFIRM: { title: '改动后需重新生成', detail: '偏好或预算变化会让草稿过期' },
  LOCATION_COMPLETION_AT_GENERATION: { title: '自动补全出发点', detail: '生成时补齐出发与返程地点' },
}

const INTEREST_EMOJI: Record<string, string> = Object.fromEntries(
  INTEREST_OPTIONS.map(({ label, emoji }) => [label, emoji]),
)

const CURRENCY_SYMBOLS: Record<string, string> = {
  CNY: '¥',
  SGD: 'S$',
  USD: 'US$',
  EUR: '€',
  JPY: 'JP¥',
}

const AVATAR_TONES = ['av-teal', 'av-blue', 'av-amber', 'av-rose']

function money(amount: number, currency?: string | null) {
  const symbol = currency ? CURRENCY_SYMBOLS[currency] : undefined
  return symbol ? `${symbol}${amount}` : `${currency ?? ''} ${amount}`.trim()
}

function initialOf(name: string) {
  return name.trim().charAt(0) || '?'
}

function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : String(cause)
}

type InputsState =
  | { kind: 'loading' }
  | { kind: 'ready'; trip: TripSummary; inputs: MainPlanInputs }
  | { kind: 'denied'; message?: string }
  | { kind: 'missing'; message?: string }
  | { kind: 'failed'; message: string }

interface MainPlanInputsProps {
  tripId: number
  dashboardOrigin?: boolean
  backToDashboard?: boolean
}

export default function MainPlanInputs({ tripId, dashboardOrigin = false, backToDashboard = false }: MainPlanInputsProps) {
  const { account } = useAuth()
  const [state, setState] = useState<InputsState>({ kind: 'loading' })
  const [generating, setGenerating] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(() => {
    let active = true
    setState({ kind: 'loading' })
    setActionError(null)
    Promise.all([
      api<TripSummary>(`/api/trips/${tripId}`),
      api<MainPlanInputs & MainPlanError>(`/api/trips/${tripId}/main-plan/inputs`),
    ])
      .then(([tripResult, inputsResult]) => {
        if (!active) return
        if (tripResult.status === 403 || inputsResult.status === 403) {
          setState({ kind: 'denied', message: inputsResult.data?.message ?? tripResult.data?.message })
        } else if (tripResult.status === 404) {
          setState({ kind: 'missing', message: tripResult.data?.message })
        } else if (tripResult.ok && tripResult.data) {
          if (inputsResult.ok && inputsResult.data) {
            setState({ kind: 'ready', trip: tripResult.data, inputs: inputsResult.data })
          } else {
            setState({ kind: 'failed', message: inputsResult.data?.message ?? `HTTP ${inputsResult.status}` })
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

  // US-079 路线1：生成后给无坐标且有地址的站查坐标（JS API），回写存库并沉淀地址簿。
  async function completeStopLocations(stops: MainPlan['stops']) {
    const pending = stops.filter((stop) => stop.lat == null && stop.address)
    if (pending.length === 0) return
    const located: Array<{ seq: number; lat: number; lng: number }> = []
    for (const stop of pending) {
      const point = await geocodeAddress(stop.address as string)
      if (point) located.push({ seq: stop.seq, lat: point.lat, lng: point.lon })
    }
    if (located.length === 0) return
    await api(`/api/trips/${tripId}/main-plan/stop-locations`, { method: 'POST', body: { stops: located } })
  }

  async function generate() {
    setGenerating(true)
    setActionError(null)
    try {
      const { status, ok, data } = await api<MainPlan & MainPlanError>(`/api/trips/${tripId}/main-plan`, { method: 'POST' })
      if (ok) {
        // US-079 路线1：缓存未命中的国内站查坐标回写；hash 跳转不卸载文档，后台可完成。
        void completeStopLocations(data?.stops ?? []).catch(() => undefined)
        window.location.hash = dashboardOrigin
          ? `#/dashboard/trips/${tripId}/main-plan`
          : `#/trips/${tripId}/main-plan`
        return
      }
      if (status === 409 && data?.code === 'MEMBERS_NOT_READY') {
        const names = (data.pendingMembers ?? []).map((member) => member.displayName).join('、')
        setActionError(`还有成员未就绪：${names}。请等所有成员提交偏好后再试。`)
      } else if (status === 409 && data?.code === 'ALREADY_CONFIRMED') {
        setActionError('主线方案已确认，不能重新生成。可前往主线方案页查看已确认版本。')
      } else {
        setActionError(data?.message ? `${data.code}: ${data.message}` : `生成失败（HTTP ${status}）`)
      }
    } catch (cause) {
      setActionError(`无法连接服务器：${errorMessage(cause)}`)
    } finally {
      setGenerating(false)
    }
  }

  const appbar = (
    <header className="appbar">
      <a className="iconbtn" href={backToDashboard
        ? `#/dashboard/trips/${tripId}`
        : dashboardOrigin
        ? `#/dashboard/trips/${tripId}/main-plan`
        : `#/trips/${tripId}/main-plan`} aria-label="Back"><Icon name="left" /></a>
      <div className="grow">
        <div className="title">生成主线方案</div>
        <div className="sub">US-031 · 仅组织者可生成 · 基于就绪成员</div>
      </div>
    </header>
  )

  if (state.kind === 'loading') {
    return (
      <div className="screen">
        {appbar}
        <div className="body"><div className="loading">正在加载生成输入…</div></div>
      </div>
    )
  }

  if (state.kind !== 'ready') {
    const heading =
      state.kind === 'denied' ? '没有访问权限'
        : state.kind === 'missing' ? '行程不存在'
          : '无法加载生成输入'
    const explanation =
      state.kind === 'denied' ? '你不是这个行程的成员，看不到偏好与预算汇总。'
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

  const { trip, inputs } = state
  const isOrganizer = trip.organizerId === account?.id
  const confirmed = trip.mainPlanConfirmed === true
  const allReady = inputs.memberCount > 0 && inputs.readyCount === inputs.memberCount
  const readyMembers = inputs.members.filter((member) => member.ready)
  const pendingMembers = inputs.members.filter((member) => !member.ready)
  const noPreferenceNames = readyMembers
    .filter((member) => member.noPreference)
    .map((member) => member.displayName)

  const budgetLines = inputs.budgets
    .filter((budget) => budget.amount != null)
    .map(
      (budget) =>
        `${budget.displayName}：${money(budget.amount as number, budget.currency)} ${
          budget.limitType === 'hard' ? '硬上限' : '软上限'
        }`,
    )
  const withoutBudget = inputs.budgets.filter((budget) => budget.amount == null).length
  const budgetSentence =
    budgetLines.length === 0
      ? '所有成员都没有设置预算。'
      : `${budgetLines.join('；')}${withoutBudget > 0 ? '；其余不设预算。' : '。'}`

  return (
    <div className="screen">
      {appbar}
      <div className="body">
        <section className="card pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div className="avstack" aria-hidden="true">
              {readyMembers.slice(0, 4).map((member, index) => (
                <span className={`av ${AVATAR_TONES[index % AVATAR_TONES.length]}`} key={member.userId}>
                  {initialOf(member.displayName)}
                </span>
              ))}
            </div>
            <div className="grow">
              <div style={{ fontSize: 13.5, fontWeight: 680 }}>
                采用 {inputs.readyCount} 位就绪成员偏好
              </div>
              <div className="tiny muted">
                {noPreferenceNames.length > 0
                  ? `含 ${noPreferenceNames.join('、')}「无偏好」→ 默认值`
                  : trip.name}
              </div>
            </div>
            <span className={allReady ? 'pill ok' : 'pill warn'}>
              {inputs.readyCount}/{inputs.memberCount}
            </span>
          </div>
        </section>

        {pendingMembers.length > 0 && (
          <section className="card pad" style={{ marginTop: 12 }}>
            <div className="label" style={{ marginBottom: 8 }}>还在等待这些成员提交</div>
            <div className="chips">
              {pendingMembers.map((member) => (
                <span className="chip" key={member.userId}>{member.displayName}</span>
              ))}
            </div>
            <p className="hint" style={{ marginTop: 8 }}>
              全员就绪后才能生成；沉默不会被当作同意。
            </p>
          </section>
        )}

        <div className="sec-title"><Icon name="sparkle" className="sm" /> 生成输入</div>
        <section className="card pad">
          <div className="label" style={{ marginBottom: 8 }}>共同兴趣</div>
          {inputs.commonInterestLabels.length > 0 ? (
            <div className="chips">
              {inputs.commonInterestLabels.map((label) => (
                <span className="chip on" key={label}>
                  {INTEREST_EMOJI[label] ?? '✨'} {label}
                </span>
              ))}
            </div>
          ) : (
            <p className="hint">暂无全员共同兴趣。</p>
          )}

          <div className="label" style={{ margin: '14px 0 8px' }}>
            <Icon name="target" className="sm" /> 必做项汇总
          </div>
          {inputs.mustDoItems.length > 0 ? (
            inputs.mustDoItems.map((item) => (
              <div className="mustdo" key={`${item.activity}|${item.location ?? ''}`}>
                <span className="md-i"><Icon name="flag" className="sm" /></span>
                <div className="md-b">
                  <div className="md-t">{item.activity}</div>
                  <div className="md-m">
                    <span>{item.memberNames.join(' / ')}</span>
                    {item.location ? (
                      <span><Icon name="pin" className="sm" /> {item.location}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="hint">成员没有提交必做项。</p>
          )}

          <div className="label" style={{ margin: '14px 0 8px' }}>约束 / 预算</div>
          <p className="hint">{budgetSentence}</p>
        </section>

        <div className="sec-title"><Icon name="route" className="sm" /> 生成规则（可解释）</div>
        <section className="card pad">
          <div className="valid">
            {inputs.rules.map((rule, index) => (
              <div className="valid-item" key={rule}>
                <span className="valid-ic brand">{index + 1}</span>
                <div>
                  <div className="vt">{RULE_TEXT[rule]?.title ?? rule}</div>
                  <div className="vd">{RULE_TEXT[rule]?.detail ?? rule}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {actionError && <p role="alert" className="error" style={{ marginTop: 12 }}>{actionError}</p>}

        {isOrganizer ? (
          <>
            <button
              className="btn btn-primary"
              type="button"
              style={{ marginTop: 18 }}
              disabled={generating || confirmed}
              onClick={generate}
            >
              <Icon name="sparkle" className="sm" />
              {generating ? '正在生成…' : confirmed ? '主线方案已确认' : '一键生成主线方案'}
            </button>
            {confirmed && (
              <p className="hint" style={{ marginTop: 10 }}>
                已确认的方案不能再重新生成，可到{' '}
                <a href={`#/trips/${tripId}/main-plan`}>主线方案</a>页查看已确认版本。
              </p>
            )}
          </>
        ) : (
          <p className="hint" style={{ marginTop: 14 }}>
            只有组织者可以生成主线方案。你可以查看以上汇总，生成后到主线方案页审阅。
          </p>
        )}
      </div>
    </div>
  )
}
