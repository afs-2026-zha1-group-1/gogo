import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import Icon from '../Icons'
import {
  ApiError,
  fetchBudgets,
  fetchMustDos,
  fetchPreferences,
  fetchReadiness,
  fetchUserInterests,
  saveBudget,
  saveMustDos,
  savePreferences,
  submitPreferences,
} from '../api/preferences'
import { useAuth } from '../features/auth/AuthProvider'
import { BUDGET_CURRENCIES, INTEREST_OPTIONS } from '../types/preferences'
import type {
  Budget,
  BudgetLimitType,
  MustDoItem,
  MustDosResponse,
  ReadinessResponse,
} from '../types/preferences'

interface PreferencesPageProps {
  tripId: number
  backHref?: string
}

interface Rejection {
  heading: string
  explanation: string
}

/**
 * The add/edit form. `id` stays null for an item the server has not issued an id for, and the
 * optional strings are sent as typed: trimming and blank-to-null are the server's business
 * (US-020 C4, MD11), so the page never pre-validates stricter than the contract.
 */
interface MustDoDraft {
  id: number | null
  activity: string
  location: string
  time: string
}

const EMPTY_DRAFT: MustDoDraft = { id: null, activity: '', location: '', time: '' }

// The prototype labels a currency as "CNY 人民币"; the wire value stays the bare ISO code.
const CURRENCY_LABELS: Record<string, string> = {
  SGD: '新加坡元',
  CNY: '人民币',
  USD: '美元',
  EUR: '欧元',
  JPY: '日元',
}

// Budget amounts travel in major units (元), so the page shows them as stored, never as 分.
const CURRENCY_SYMBOLS: Record<string, string> = {
  SGD: 'S$',
  CNY: '¥',
  USD: 'US$',
  EUR: '€',
  JPY: 'JP¥',
}

function money(amount: number, currency?: string | null) {
  const symbol = currency ? CURRENCY_SYMBOLS[currency] : undefined
  return symbol ? `${symbol}${amount}` : `${currency ?? ''} ${amount}`.trim()
}

/** Identity, membership and trip failures get their own copy and a way back (PAGE-8). */
function rejectionOf(error: unknown): Rejection | null {
  if (!(error instanceof ApiError)) return null
  if (error.status === 401) {
    return { heading: '需要重新登录', explanation: '登录会话已失效，请重新登录后再试。' }
  }
  if (error.status === 403) {
    return { heading: '没有访问权限', explanation: '你不是这个行程的成员。请先通过邀请链接加入。' }
  }
  if (error.status === 404) {
    return { heading: '行程不存在', explanation: '没有这个行程，或链接中的编号不正确。' }
  }
  return null
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败，请重试'
}

/** The submit path turns the empty-submission rejection into copy the member can act on. */
function submissionFailureOf(error: unknown): string {
  if (error instanceof ApiError && error.code === 'PREFERENCE_EMPTY') {
    return '先选择至少一项偏好，或打开「我没有特别偏好」，然后再提交。'
  }
  return messageOf(error)
}

export default function PreferencesPage({ tripId, backHref = `#/trips/${tripId}` }: PreferencesPageProps) {
  // US-066: the session supplies identity, so the page no longer takes a userId prop.
  const { account } = useAuth()
  const userId = account?.id ?? null
  const queryClient = useQueryClient()
  // MD11: two independent caches, so a must-do action never rewrites the interest section.
  const interestsKey = ['preferences', tripId, userId]
  const mustDosKey = ['must-dos', tripId, userId]
  const [selected, setSelected] = useState<string[]>([])
  const [acknowledged, setAcknowledged] = useState<string[]>([])

  // `items` is only ever what the server acknowledged, so a rejected action needs no rollback:
  // the list simply stays where it was (PAGE-14).
  const [items, setItems] = useState<MustDoItem[]>([])
  const [draft, setDraft] = useState<MustDoDraft | null>(null)
  const [pendingDelete, setPendingDelete] = useState<MustDoItem | null>(null)
  const [mustDoFailure, setMustDoFailure] = useState<string | null>(null)

  // US-024 budget state. Amount stays a string while editing so the field can be blank; the page
  // persists it only when the member submits the whole preference set below (US-026).
  const [savedBudget, setSavedBudget] = useState<Budget | null>(null)
  const [budgetAmount, setBudgetAmount] = useState('')
  const [budgetCurrency, setBudgetCurrency] = useState<string>('SGD')
  const [budgetLimitType, setBudgetLimitType] = useState<BudgetLimitType>('hard')

  // US-026 readiness state.
  const [noPreference, setNoPreference] = useState(false)
  // What the server last acknowledged; `dirty` compares against it rather than against the raw
  // stored arrays, because choosing "no preference" makes those arrays irrelevant.
  const [ackNoPreference, setAckNoPreference] = useState(false)
  const [readyStatus, setReadyStatus] = useState<'ready' | 'pending'>('pending')
  const [submissionFailure, setSubmissionFailure] = useState<string | null>(null)
  const [readinessInfo, setReadinessInfo] = useState<ReadinessResponse | null>(null)

  // Turning the switch on clears the picks; turning it back off restores them, so an accidental
  // tap never destroys what the member had already selected.
  const restoreRef = useRef<{
    interests: string[]
    amount: string
    currency: string
    limitType: BudgetLimitType
  } | null>(null)
  // A local switch flip must survive background refetches until the member submits.
  const noPrefTouched = useRef(false)

  const query = useQuery({
    queryKey: interestsKey,
    queryFn: () => fetchPreferences(tripId),
  })

  const mustDosQuery = useQuery({
    queryKey: mustDosKey,
    queryFn: () => fetchMustDos(tripId),
  })

  const budgetsKey = ['budgets', tripId, userId]
  const readinessKey = ['readiness', tripId, userId]
  const budgetsQuery = useQuery({ queryKey: budgetsKey, queryFn: () => fetchBudgets(tripId) })
  const readinessQuery = useQuery({ queryKey: readinessKey, queryFn: () => fetchReadiness(tripId) })
  // US-019: personal defaults, used only to pre-select when this member has no saved interests.
  const userDefaultsQuery = useQuery({ queryKey: ['user-interests', userId], queryFn: fetchUserInterests })
  const defaultsApplied = useRef(false)

  // Switching identity starts from an empty, clearly unloaded state; the fetches below seed it.
  useEffect(() => {
    setSelected([])
    setAcknowledged([])
    setItems([])
    setDraft(null)
    setPendingDelete(null)
    setMustDoFailure(null)
    setSavedBudget(null)
    setBudgetAmount('')
    setBudgetCurrency('SGD')
    setBudgetLimitType('hard')
    setNoPreference(false)
    setAckNoPreference(false)
    setReadyStatus('pending')
    setSubmissionFailure(null)
    setReadinessInfo(null)
    restoreRef.current = null
    noPrefTouched.current = false
    defaultsApplied.current = false
  }, [tripId, userId])

  useEffect(() => {
    if (!query.data) return
    const mine = query.data.members.find((member) => member.userId === userId)
    const interests = mine ? mine.interests : []
    setSelected(interests)
    setAcknowledged(interests)
  }, [query.data, userId])

  useEffect(() => {
    if (!mustDosQuery.data) return
    const mine = mustDosQuery.data.members.find((member) => member.userId === userId)
    setItems(mine ? mine.mustDos : [])
    setDraft(null)
    setPendingDelete(null)
    setMustDoFailure(null)
  }, [mustDosQuery.data, userId])

  useEffect(() => {
    if (!budgetsQuery.data) return
    const mine = budgetsQuery.data.members.find((member) => member.userId === userId)
    const budget = mine ? mine.budget : null
    setSavedBudget(budget)
    setBudgetAmount(budget ? String(budget.amount) : '')
    setBudgetCurrency(budget ? budget.currency : 'SGD')
    setBudgetLimitType(budget ? budget.limitType : 'hard')
  }, [budgetsQuery.data, userId])

  useEffect(() => {
    if (!readinessQuery.data) return
    setReadinessInfo(readinessQuery.data)
    const mine = readinessQuery.data.members.find((member) => member.userId === userId)
    setReadyStatus(mine ? mine.status : 'pending')
    setAckNoPreference(mine ? mine.noPreference : false)
    if (!noPrefTouched.current) {
      setNoPreference(mine ? mine.noPreference : false)
    }
  }, [readinessQuery.data, userId])

  // US-019: pre-select the user's defaults (unsaved) when this member has no saved interests.
  useEffect(() => {
    if (defaultsApplied.current) return
    if (!query.data || !userDefaultsQuery.data) return
    const mine = query.data.members.find((member) => member.userId === userId)
    const saved = mine ? mine.interests : []
    if (!noPreference && saved.length === 0 && userDefaultsQuery.data.interests.length > 0) {
      setSelected(userDefaultsQuery.data.interests)
    }
    defaultsApplied.current = true
  }, [query.data, userDefaultsQuery.data, userId, noPreference])

  // Each confirmed must-do action is exactly one whole-list PUT, and the page adopts the
  // response so the id comes from the server (PAGE-6, PAGE-7, PAGE-9).
  const mustDoMutation = useMutation({
    mutationFn: (next: MustDoItem[]) => saveMustDos(tripId, next),
    onSuccess: (response) => {
      setItems(response.items)
      setDraft(null)
      setPendingDelete(null)
      setMustDoFailure(null)
      queryClient.setQueryData<MustDosResponse>(mustDosKey, (previous) =>
        previous
          ? {
              members: previous.members.map((member) =>
                member.userId === userId ? { ...member, mustDos: response.items } : member,
              ),
            }
          : previous,
      )
    },
    onError: (error) => setMustDoFailure(messageOf(error)),
  })

  // PAGE-16 replaced: the bottom bar is now the only save. One click writes the interest set, the
  // budget (or its cleared state) and then the readiness row, in that order — a failure in any
  // step leaves the member pending, so the badge never claims a save that did not happen.
  const submitMutation = useMutation({
    mutationFn: async () => {
      const interests = noPreference ? [] : selected
      const amount = noPreference || budgetAmount === '' ? null : Number(budgetAmount)
      const saved = await savePreferences(tripId, interests)
      await saveBudget(tripId, amount, budgetCurrency, budgetLimitType)
      const submission = await submitPreferences(tripId, noPreference)
      return { interests: saved.interests, amount, submission }
    },
    onSuccess: ({ interests, amount, submission }) => {
      setSelected(interests)
      setAcknowledged(interests)
      setSavedBudget(
        amount === null
          ? null
          : { amount, currency: budgetCurrency, limitType: budgetLimitType },
      )
      setBudgetAmount(amount === null ? '' : String(amount))
      setReadyStatus(submission.status === 'ready' ? 'ready' : 'pending')
      setAckNoPreference(submission.noPreference)
      setSubmissionFailure(null)
      restoreRef.current = null
      noPrefTouched.current = false
      void queryClient.invalidateQueries({ queryKey: interestsKey })
      void queryClient.invalidateQueries({ queryKey: budgetsKey })
      void queryClient.invalidateQueries({ queryKey: readinessKey })
    },
    onError: (error) => setSubmissionFailure(submissionFailureOf(error)),
  })

  // PAGE-1: while either GET is pending both sections are inert.
  const loading = query.isLoading || mustDosQuery.isLoading
  const busy = loading || submitMutation.isPending || mustDoMutation.isPending
  const mustDoBusy = loading || mustDoMutation.isPending
  const rejection = rejectionOf(query.error) ?? rejectionOf(mustDosQuery.error)
  const loadFailed = query.isError || mustDosQuery.isError
  // "Silence is not consent": with the switch off there must be something to submit.
  const hasContent =
    noPreference || selected.length > 0 || budgetAmount !== '' || items.length > 0
  // US-027 render rule: an explicit "no preference" shows the personal fields as empty even when
  // an earlier save left values on the server; submitting is what actually clears them.
  const visibleSelected = noPreference ? [] : selected
  const visibleAmount = noPreference ? '' : budgetAmount
  // The baseline is the stored state projected the same way, so flipping the switch is dirty only
  // when the server has not acknowledged that choice yet.
  const baselineInterests = ackNoPreference ? [] : acknowledged
  const baselineAmount = ackNoPreference || savedBudget === null ? '' : String(savedBudget.amount)
  const interestDirty =
    visibleSelected.length !== baselineInterests.length ||
    visibleSelected.some((label) => !baselineInterests.includes(label))
  const budgetDirty =
    visibleAmount === ''
      ? baselineAmount !== ''
      : baselineAmount === '' ||
        Number(visibleAmount) !== Number(baselineAmount) ||
        (savedBudget !== null &&
          (budgetCurrency !== savedBudget.currency || budgetLimitType !== savedBudget.limitType))
  const dirty = noPreference !== ackNoPreference || interestDirty || budgetDirty

  const submitItems = (next: MustDoItem[]) => {
    if (mustDoBusy) return
    setMustDoFailure(null)
    mustDoMutation.mutate(next)
  }

  const submitDraft = () => {
    if (!draft) return
    const item: MustDoItem = {
      id: draft.id,
      activity: draft.activity,
      location: draft.location,
      time: draft.time,
    }
    submitItems(draft.id === null ? [...items, item] : items.map((one) => (one.id === draft.id ? item : one)))
  }

  const statusLabel = submitMutation.isPending
    ? '提交中'
    : dirty
      ? '待提交'
      : readyStatus === 'ready'
        ? '已就绪'
        : '未提交'
  const statusTone =
    readyStatus === 'ready' && !dirty && !submitMutation.isPending ? 'pill ok' : 'pill'

  const appbar = (
    <div className="appbar">
      <a className="iconbtn" href={backHref} aria-label="返回行程">
        <Icon name="left" />
      </a>
      <div className="grow">
        <div className="title">我的偏好</div>
        <div className="sub">{account ? `${account.name} · US-019~027` : 'US-019~027'}</div>
      </div>
      {/* US-026: the badge reports submission, not whether a section happens to be saved. */}
      {!loadFailed && <span className={statusTone}>{statusLabel}</span>}
    </div>
  )

  if (loadFailed) {
    return (
      <div className="screen">
        {appbar}
        <div className="body">
          <div className="card pad">
            <div className="notice" role="alert">
              <strong>{rejection ? rejection.heading : '无法加载偏好设置'}</strong>
              <span>
                {rejection ? rejection.explanation : messageOf(query.error ?? mustDosQuery.error)}
              </span>
            </div>
            <div className="btnrow" style={{ marginTop: 14 }}>
              {/* PAGE-18: retry both sections, and never render a stale or empty list as saved. */}
              {!rejection && (
                <button
                  type="button"
                  className="btn btn-ghost sm"
                  onClick={() => {
                    void query.refetch()
                    void mustDosQuery.refetch()
                  }}
                >
                  重试
                </button>
              )}
              <a className="btn btn-ghost sm" href={backHref}>
                返回行程
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const toggle = (label: string) => {
    if (busy || noPreference) return
    setSelected((current) =>
      current.includes(label) ? current.filter((value) => value !== label) : [...current, label],
    )
  }

  // US-027: an explicit "no preference" clears every personal value instead of leaving stale
  // picks that would still reach the planner once the member submits.
  const toggleNoPreference = () => {
    if (busy) return
    setSubmissionFailure(null)
    noPrefTouched.current = true
    if (noPreference) {
      const restore = restoreRef.current
      setNoPreference(false)
      if (restore) {
        setSelected(restore.interests)
        setBudgetAmount(restore.amount)
        setBudgetCurrency(restore.currency)
        setBudgetLimitType(restore.limitType)
      }
      restoreRef.current = null
      return
    }
    restoreRef.current = {
      interests: selected,
      amount: budgetAmount,
      currency: budgetCurrency,
      limitType: budgetLimitType,
    }
    setNoPreference(true)
    setSelected([])
    setBudgetAmount('')
  }

  return (
    <div className="screen">
      {appbar}
      <div className="body">
        {/* US-027: the switch comes first because it decides whether anything below counts. */}
        <div className="card pad" style={{ background: 'var(--surface-2)' }}>
          <div className="switch-row">
            <div className="txt">
              <b>我没有特别偏好</b>
              <p>显式选择后按默认参与规划（US-027）</p>
            </div>
            <button
              type="button"
              className={noPreference ? 'switch on' : 'switch'}
              role="switch"
              aria-checked={noPreference}
              aria-label="我没有特别偏好"
              disabled={busy}
              onClick={toggleNoPreference}
            />
          </div>
        </div>

        {noPreference && (
          <div
            className="card pad"
            style={{ borderColor: '#99f6e4', background: 'linear-gradient(135deg,#f0fdfa,#fff)' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--brand-ink)',
              }}
            >
              <Icon name="shield" className="sm" /> 已选择无偏好
            </div>
            <p className="hint" style={{ marginTop: 6 }}>
              已勾选的兴趣与填写的预算会被清空；提交后规划使用默认值，并把你标记为就绪。
            </p>
          </div>
        )}

        {readinessInfo && (
          <p className="hint" style={{ marginTop: 12 }}>
            就绪进度：{readinessInfo.readyCount}/{readinessInfo.memberCount}
            {readinessInfo.allReady ? ' · 全员已就绪' : ''}
            {dirty ? ' · 有未提交的修改' : ''}
          </p>
        )}

        <div className="sec-title">
          <Icon name="star" className="sm" /> 兴趣（US-019 · 预设列表、不重复）
        </div>

        {query.isLoading ? (
          <p className="hint">正在加载你的选择…</p>
        ) : (
          <div className="chips">
            {INTEREST_OPTIONS.map(({ label, emoji }) => {
              const on = visibleSelected.includes(label)
              return (
                <button
                  key={label}
                  type="button"
                  className={on ? 'pick on' : 'pick'}
                  aria-pressed={on}
                  disabled={busy || noPreference}
                  onClick={() => toggle(label)}
                >
                  <span aria-hidden="true">{emoji}</span>
                  {label}
                </button>
              )
            })}
          </div>
        )}

        <p className="hint" style={{ marginTop: 10 }}>
          选中你在这趟旅程中喜欢的主题；点底部的「提交并标记就绪」后，行程成员才能看到。
        </p>

        <div className="sec-title" style={{ marginTop: 22 }}>
          <Icon name="target" className="sm" /> 必做项（US-020 · 可增删改）
        </div>

        {mustDosQuery.isLoading ? (
          <p className="hint">正在加载你的必做项…</p>
        ) : (
          <>
            {items.length === 0 && !draft && (
              <div className="empty-state" style={{ marginTop: 4 }}>
                <h2>还没有必做项</h2>
                <p className="hint">添加你这趟旅程里不想错过的活动；地点与时间至少填一项。</p>
              </div>
            )}

            {items.map((item) => (
              <div key={item.id ?? item.activity} className="card pad mustdo-row">
                <div className="mustdo-lead" aria-hidden="true">
                  <Icon name="flag" />
                </div>
                <div className="grow">
                  <div className="title">{item.activity}</div>
                  <div className="hint meta-line">
                    {item.location ? (
                      <span className="meta">
                        <Icon name="pin" className="sm" />
                        {item.location}
                      </span>
                    ) : null}
                    <span className="meta">
                      {item.time ? (
                        <>
                          <Icon name="clock" className="sm" />
                          {item.time}
                        </>
                      ) : (
                        '未定时间'
                      )}
                    </span>
                  </div>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="iconbtn"
                    aria-label="编辑必做项"
                    disabled={mustDoBusy}
                    onClick={() => {
                      setPendingDelete(null)
                      setDraft({
                        id: item.id,
                        activity: item.activity,
                        location: item.location ?? '',
                        time: item.time ?? '',
                      })
                    }}
                  >
                    <Icon name="edit" className="sm" />
                  </button>
                  <button
                    type="button"
                    className="iconbtn"
                    aria-label="删除必做项"
                    disabled={mustDoBusy}
                    onClick={() => {
                      setDraft(null)
                      setPendingDelete(item)
                    }}
                  >
                    <Icon name="trash" className="sm" />
                  </button>
                </div>
              </div>
            ))}

            {/* PAGE-8 / PAGE-9: the dialog names the item and nothing is sent until Confirm. */}
            {pendingDelete && (
              <div className="card pad">
                <div className="notice" role="alert">
                  <strong>删除「{pendingDelete.activity}」？</strong>
                  <span>确认后才发送删除请求；取消不会改动列表，也不会影响未保存的兴趣选择。</span>
                </div>
                <div className="btnrow">
                  <button
                    type="button"
                    className="btn btn-ghost sm"
                    disabled={mustDoBusy}
                    onClick={() => setPendingDelete(null)}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary sm"
                    disabled={mustDoBusy}
                    onClick={() =>
                      submitItems(items.filter((one) => one.id !== pendingDelete.id))
                    }
                  >
                    {mustDoMutation.isPending ? '正在删除…' : '确认'}
                  </button>
                </div>
              </div>
            )}

            {draft && (
              <div className="card pad">
                <div className="field">
                  <label className="label" htmlFor="mustdo-activity">
                    活动名称
                  </label>
                  <input
                    id="mustdo-activity"
                    className="input"
                    value={draft.activity}
                    disabled={mustDoBusy}
                    onChange={(event) => setDraft({ ...draft, activity: event.target.value })}
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="mustdo-location">
                    地点
                  </label>
                  <input
                    id="mustdo-location"
                    className="input"
                    placeholder="例如 National Gallery Singapore"
                    value={draft.location}
                    disabled={mustDoBusy}
                    onChange={(event) => setDraft({ ...draft, location: event.target.value })}
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="mustdo-time">
                    固定时间
                  </label>
                  <input
                    id="mustdo-time"
                    className="input"
                    type="time"
                    value={draft.time}
                    disabled={mustDoBusy}
                    onChange={(event) => setDraft({ ...draft, time: event.target.value })}
                  />
                  <p className="hint" style={{ marginTop: 8 }}>
                    地点与时间至少填一项；时间使用 24 小时制（例如 09:00），保存后立即生效。
                  </p>
                </div>
                <div className="btnrow">
                  <button
                    type="button"
                    className="btn btn-ghost sm"
                    disabled={mustDoBusy}
                    onClick={() => setDraft(null)}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary sm"
                    disabled={mustDoBusy}
                    onClick={submitDraft}
                  >
                    {mustDoMutation.isPending ? '正在保存…' : '保存'}
                  </button>
                </div>
              </div>
            )}

            {!draft && (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={mustDoBusy}
                onClick={() => {
                  setPendingDelete(null)
                  setDraft(EMPTY_DRAFT)
                }}
                style={{ marginTop: 12 }}
              >
                <Icon name="plus" className="sm" /> 添加必做项
              </button>
            )}

            {mustDoFailure && (
              <div className="notice" role="alert" style={{ marginTop: 14 }}>
                <strong>{mustDoFailure}</strong>
              </div>
            )}
          </>
        )}

        <div className="sec-title" style={{ marginTop: 22 }}>
          <Icon name="wallet" className="sm" /> 预算（US-024 · 可选、人均全程）
        </div>

        {budgetsQuery.isLoading ? (
          <p className="hint">正在加载你的预算…</p>
        ) : (
          <div className="card pad">
            <div className="two">
              <div className="field" style={{ marginBottom: 11 }}>
                <label className="label" htmlFor="budget-amount">
                  金额 <span className="opt">可选</span>
                </label>
                <div className="inp-ic">
                  <Icon name="wallet" />
                  <input
                    id="budget-amount"
                    className="input"
                    inputMode="numeric"
                    placeholder="留空=不设预算"
                    value={visibleAmount}
                    disabled={busy || noPreference}
                    onChange={(event) => {
                      setSubmissionFailure(null)
                      setBudgetAmount(event.target.value.replace(/[^0-9]/g, ''))
                    }}
                  />
                </div>
              </div>
              <div className="field" style={{ marginBottom: 11 }}>
                <label className="label" htmlFor="budget-currency">
                  币种
                </label>
                <select
                  id="budget-currency"
                  className="input"
                  value={budgetCurrency}
                  disabled={busy || noPreference}
                  onChange={(event) => setBudgetCurrency(event.target.value)}
                >
                  {BUDGET_CURRENCIES.map((code) => (
                    <option key={code} value={code}>
                      {code} {CURRENCY_LABELS[code] ?? ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <span className="label">限额类型</span>
            <div className="seg" role="group" aria-label="限额类型">
              <button
                type="button"
                className={budgetLimitType === 'soft' ? 'on' : ''}
                aria-pressed={budgetLimitType === 'soft'}
                disabled={busy || noPreference}
                onClick={() => setBudgetLimitType('soft')}
              >
                软上限·尽量不超
              </button>
              <button
                type="button"
                className={budgetLimitType === 'hard' ? 'on' : ''}
                aria-pressed={budgetLimitType === 'hard'}
                disabled={busy || noPreference}
                onClick={() => setBudgetLimitType('hard')}
              >
                硬上限·绝不超
              </button>
            </div>
            <p className="help">
              非负整数、人均、整段行程，金额按所选币种的元填写。硬上限会在生成时被严格过滤；软上限仅尽量满足。
            </p>
            {budgetLimitType === 'soft' && visibleAmount !== '' && (
              <p className="hint" style={{ marginTop: 8 }}>
                软上限约 {money(Math.round(Number(visibleAmount) * 0.8), budgetCurrency)}–
                {money(Math.round(Number(visibleAmount) * 1.2), budgetCurrency)}（以{' '}
                {visibleAmount} 为基准上下浮动 20%）。
              </p>
            )}
            {savedBudget && !noPreference && (
              <p className="hint" style={{ marginTop: 10 }}>
                已保存：{money(savedBudget.amount, savedBudget.currency)} ·{' '}
                {savedBudget.limitType === 'hard' ? '硬上限' : '软上限'}
              </p>
            )}
          </div>
        )}

      </div>

      <div className="actionbar">
        {/* US-026: one click writes interests and budget, then marks the member ready. */}
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || !hasContent}
          onClick={() => submitMutation.mutate()}
        >
          <Icon name="check" className="sm" />
          {submitMutation.isPending
            ? '正在提交…'
            : noPreference
              ? readyStatus === 'ready'
                ? '重新确认无偏好并就绪'
                : '确认无偏好并就绪'
              : readyStatus === 'ready'
                ? '重新提交并标记就绪'
                : '提交并标记就绪'}
        </button>
        {submissionFailure && (
          <div className="notice" role="alert" style={{ marginTop: 10 }}>
            <strong>{submissionFailure}</strong>
          </div>
        )}
      </div>
    </div>
  )
}
