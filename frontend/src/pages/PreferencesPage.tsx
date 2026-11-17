import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import Icon from '../Icons'
import {
  ApiError,
  fetchMustDos,
  fetchPreferences,
  saveMustDos,
  savePreferences,
} from '../api/preferences'
import { useAuth } from '../features/auth/AuthProvider'
import { INTEREST_OPTIONS } from '../types/preferences'
import type { MustDoItem, MustDosResponse, PreferencesResponse } from '../types/preferences'

interface PreferencesPageProps {
  tripId: number
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

export default function PreferencesPage({ tripId }: PreferencesPageProps) {
  // US-066: the session supplies identity, so the page no longer takes a userId prop.
  const { account } = useAuth()
  const userId = account?.id ?? null
  const queryClient = useQueryClient()
  // MD11: two independent caches, so a must-do action never rewrites the interest section.
  const interestsKey = ['preferences', tripId]
  const mustDosKey = ['must-dos', tripId]
  const [selected, setSelected] = useState<string[]>([])
  const [acknowledged, setAcknowledged] = useState<string[]>([])
  const [failure, setFailure] = useState<string | null>(null)

  // `items` is only ever what the server acknowledged, so a rejected action needs no rollback:
  // the list simply stays where it was (PAGE-14).
  const [items, setItems] = useState<MustDoItem[]>([])
  const [draft, setDraft] = useState<MustDoDraft | null>(null)
  const [pendingDelete, setPendingDelete] = useState<MustDoItem | null>(null)
  const [mustDoFailure, setMustDoFailure] = useState<string | null>(null)

  const query = useQuery({
    queryKey: interestsKey,
    queryFn: () => fetchPreferences(tripId),
  })

  const mustDosQuery = useQuery({
    queryKey: mustDosKey,
    queryFn: () => fetchMustDos(tripId),
  })

  // Switching identity starts from an empty, clearly unloaded state; the fetches below seed it.
  useEffect(() => {
    setSelected([])
    setAcknowledged([])
    setFailure(null)
    setItems([])
    setDraft(null)
    setPendingDelete(null)
    setMustDoFailure(null)
  }, [tripId, userId])

  useEffect(() => {
    if (!query.data) return
    const mine = query.data.members.find((member) => member.userId === userId)
    const interests = mine ? mine.interests : []
    setSelected(interests)
    setAcknowledged(interests)
    setFailure(null)
  }, [query.data, userId])

  useEffect(() => {
    if (!mustDosQuery.data) return
    const mine = mustDosQuery.data.members.find((member) => member.userId === userId)
    setItems(mine ? mine.mustDos : [])
    setDraft(null)
    setPendingDelete(null)
    setMustDoFailure(null)
  }, [mustDosQuery.data, userId])

  const mutation = useMutation({
    mutationFn: (interests: string[]) => savePreferences(tripId, interests),
    onSuccess: (response) => {
      setSelected(response.interests)
      setAcknowledged(response.interests)
      setFailure(null)
      queryClient.setQueryData<PreferencesResponse>(interestsKey, (previous) =>
        previous
          ? {
              members: previous.members.map((member) =>
                member.userId === userId ? { ...member, interests: response.interests } : member,
              ),
            }
          : previous,
      )
    },
    onError: (error) => {
      setSelected(acknowledged)
      setFailure(messageOf(error))
    },
  })

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

  // PAGE-1: while either GET is pending both sections are inert.
  const loading = query.isLoading || mustDosQuery.isLoading
  const busy = loading || mutation.isPending
  const mustDoBusy = loading || mustDoMutation.isPending
  const rejection = rejectionOf(query.error) ?? rejectionOf(mustDosQuery.error)
  const loadFailed = query.isError || mustDosQuery.isError
  const dirty =
    selected.length !== acknowledged.length ||
    selected.some((label) => !acknowledged.includes(label))

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

  const statusLabel = query.isLoading
    ? '加载中'
    : mutation.isPending
      ? '保存中'
      : dirty
        ? '未保存'
        : '已保存'
  const statusTone = !busy && !dirty ? 'pill ok' : 'pill'

  const appbar = (
    <div className="appbar">
      <a className="iconbtn" href={`#/trips/${tripId}`} aria-label="返回行程">
        <Icon name="left" />
      </a>
      <div className="grow">
        <div className="title">我的偏好</div>
        <div className="sub">{account ? `${account.name} · US-019~020` : 'US-019~020'}</div>
      </div>
      {/* R3: the badge keeps describing the interests section only. */}
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
              <a className="btn btn-ghost sm" href={`#/trips/${tripId}`}>
                返回行程
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const toggle = (label: string) => {
    if (busy) return
    setFailure(null)
    setSelected((current) =>
      current.includes(label) ? current.filter((value) => value !== label) : [...current, label],
    )
  }

  return (
    <div className="screen">
      {appbar}
      <div className="body">
        <div className="sec-title">
          <Icon name="star" className="sm" /> 兴趣（US-019 · 预设列表、不重复）
        </div>

        {query.isLoading ? (
          <p className="hint">正在加载你的选择…</p>
        ) : (
          <div className="chips">
            {INTEREST_OPTIONS.map(({ label, emoji }) => {
              const on = selected.includes(label)
              return (
                <button
                  key={label}
                  type="button"
                  className={on ? 'pick on' : 'pick'}
                  aria-pressed={on}
                  disabled={busy}
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
          选中你在这趟旅程中喜欢的主题；保存后行程成员都能看到。
        </p>

        {failure && (
          <div className="notice" role="alert" style={{ marginTop: 14 }}>
            <strong>{failure}</strong>
          </div>
        )}

        <div className="sec-title" style={{ marginTop: 22 }}>
          <Icon name="pin" className="sm" /> 必做项（US-020 · 可增删改）
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
                  <p className="hint">
                    {item.location ? (
                      <>
                        <Icon name="pin" className="sm" /> {item.location}
                      </>
                    ) : null}{' '}
                    {item.time ? (
                      <>
                        <Icon name="clock" className="sm" /> {item.time}
                      </>
                    ) : (
                      '未定时间'
                    )}
                  </p>
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
      </div>

      <div className="actionbar">
        {/* PAGE-16: the bottom bar stays the interest save; each item action persists itself. */}
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => mutation.mutate(selected)}
        >
          <Icon name="check" className="sm" />
          {mutation.isPending ? '正在保存…' : '保存偏好'}
        </button>
      </div>
    </div>
  )
}
