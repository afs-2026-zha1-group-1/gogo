import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import Icon from '../Icons'
import type { MainPlan, MainPlanError, MainPlanInputs, TripSummary } from '../types/mainPlan'

// Screen 9 (US-031, design D11): generation inputs summary. Members read,
// only the organizer sees the generate action. Display wording is free per
// the fixtures ruling; the six rule identifiers come from the API.
const RULE_LABELS: Record<string, string> = {
  ALL_MEMBERS_READY: '全员就绪才生成',
  SUPPLIED_ACTIVITY_TIMES: '采用成员提供的活动时间',
  TRAVEL_LEGS_BETWEEN_STOPS: '站点之间预留路程时间',
  HARD_BUDGET_RESPECTED: '不超过任何成员的硬预算',
  STALE_DRAFT_BLOCKS_CONFIRM: '草稿过期须重新生成后才能确认',
  LOCATION_COMPLETION_AT_GENERATION: '生成时自动补全出发 / 返程地点',
}

function sgd(cents: number) {
  return `S$${cents / 100}`
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
  userId: number
  tripId: number
}

export default function MainPlanInputs({ userId, tripId }: MainPlanInputsProps) {
  const [state, setState] = useState<InputsState>({ kind: 'loading' })
  const [generating, setGenerating] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(() => {
    let active = true
    setState({ kind: 'loading' })
    setActionError(null)
    Promise.all([
      api<TripSummary>(`/api/trips/${tripId}`, { userId }),
      api<MainPlanInputs & MainPlanError>(`/api/trips/${tripId}/main-plan/inputs`, { userId }),
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
  }, [userId, tripId])

  useEffect(() => load(), [load])

  async function generate() {
    setGenerating(true)
    setActionError(null)
    try {
      const { status, ok, data } = await api<MainPlan & MainPlanError>(`/api/trips/${tripId}/main-plan`, { userId, method: 'POST' })
      if (ok) {
        window.location.hash = `#/trips/${tripId}/main-plan`
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
      <a className="iconbtn" href={`#/trips/${tripId}`} aria-label="Back"><Icon name="left" /></a>
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
  const isOrganizer = trip.organizerId === userId

  return (
    <div className="screen">
      {appbar}
      <div className="body">
        <section className="card pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 680 }}>
                采用 {inputs.readyCount} 位就绪成员偏好
              </div>
              <div className="tiny muted">{trip.name}</div>
            </div>
            <span className={inputs.readyCount === inputs.memberCount ? 'pill ok' : 'pill warn'}>
              {inputs.readyCount}/{inputs.memberCount}
            </span>
          </div>
          <div className="valid" style={{ marginTop: 10 }}>
            {inputs.members.map((member) => (
              <div className="valid-item" key={member.userId}>
                <span className="valid-ic"><Icon name="user" className="sm" /></span>
                <div>
                  <div className="vt">{member.displayName}</div>
                  <div className="vd">
                    {member.ready ? `已就绪 · 偏好修订 ${member.preferenceRevision}` : '未就绪'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="sec-title"><Icon name="info" className="sm" /> 生成输入</div>
        <section className="card pad">
          <div className="label" style={{ marginBottom: 8 }}>共同兴趣</div>
          {inputs.commonInterests.length > 0 ? (
            <div className="chips">
              {inputs.commonInterests.map((code) => <span className="chip" key={code}>{code}</span>)}
            </div>
          ) : (
            <p className="hint">暂无全员共同兴趣。</p>
          )}
          <div className="label" style={{ margin: '14px 0 8px' }}>必做项汇总</div>
          {inputs.mustDo.length > 0 ? (
            <div className="chips">
              {inputs.mustDo.map((item) => <span className="chip" key={item}>{item}</span>)}
            </div>
          ) : (
            <p className="hint">成员没有提交必做项。</p>
          )}
          <div className="label" style={{ margin: '14px 0 8px' }}>预算</div>
          <div className="valid">
            {inputs.budgets.map((budget) => (
              <div className="valid-item" key={budget.userId}>
                <span className="valid-ic"><Icon name="shield" className="sm" /></span>
                <div>
                  <div className="vt">{budget.displayName}</div>
                  <div className="vd">
                    {budget.hardBudgetCents == null
                      ? '不设硬预算'
                      : `人均硬上限 ${sgd(budget.hardBudgetCents)}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="sec-title"><Icon name="flag" className="sm" /> 生成规则（可解释）</div>
        <section className="card pad">
          <div className="valid">
            {inputs.rules.map((rule, index) => (
              <div className="valid-item" key={rule}>
                <span className="valid-ic brand">{index + 1}</span>
                <div>
                  <div className="vt">{RULE_LABELS[rule] ?? rule}</div>
                  <div className="vd">{rule}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {actionError && <p role="alert" className="error" style={{ marginTop: 12 }}>{actionError}</p>}

        {isOrganizer ? (
          <button
            className="btn btn-primary"
            type="button"
            style={{ marginTop: 18 }}
            disabled={generating}
            onClick={generate}
          >
            <Icon name="nav" className="sm" />
            {generating ? '正在生成…' : '一键生成主线方案'}
          </button>
        ) : (
          <p className="hint" style={{ marginTop: 14 }}>
            只有组织者可以生成主线方案。你可以查看以上汇总，生成后到主线方案页审阅。
          </p>
        )}
      </div>
    </div>
  )
}