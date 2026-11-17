import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import Icon from '../Icons'
import { ApiError, fetchPreferences, savePreferences } from '../api/preferences'
import { useAuth } from '../features/auth/AuthProvider'
import { INTEREST_OPTIONS } from '../types/preferences'
import type { PreferencesResponse } from '../types/preferences'

interface PreferencesPageProps {
  tripId: number
}

interface Rejection {
  heading: string
  explanation: string
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

export default function PreferencesPage({ tripId }: PreferencesPageProps) {
  // US-066: the session supplies identity, so the page no longer takes a userId prop.
  const { account } = useAuth()
  const userId = account?.id ?? null
  const queryClient = useQueryClient()
  const queryKey = ['preferences', tripId]
  const [selected, setSelected] = useState<string[]>([])
  const [acknowledged, setAcknowledged] = useState<string[]>([])
  const [failure, setFailure] = useState<string | null>(null)

  const query = useQuery({
    queryKey,
    queryFn: () => fetchPreferences(tripId),
  })

  // Switching identity starts from an empty, clearly unloaded state; the fetch below seeds it.
  useEffect(() => {
    setSelected([])
    setAcknowledged([])
    setFailure(null)
  }, [tripId, userId])

  useEffect(() => {
    if (!query.data) return
    const mine = query.data.members.find((member) => member.userId === userId)
    const interests = mine ? mine.interests : []
    setSelected(interests)
    setAcknowledged(interests)
    setFailure(null)
  }, [query.data, userId])

  const mutation = useMutation({
    mutationFn: (interests: string[]) => savePreferences(tripId, interests),
    onSuccess: (response) => {
      setSelected(response.interests)
      setAcknowledged(response.interests)
      setFailure(null)
      queryClient.setQueryData<PreferencesResponse>(queryKey, (previous) =>
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

  const busy = query.isLoading || mutation.isPending
  const rejection = query.isError ? rejectionOf(query.error) : null
  const dirty =
    selected.length !== acknowledged.length ||
    selected.some((label) => !acknowledged.includes(label))

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
        <div className="sub">{account ? `${account.name} · US-019` : 'US-019 · 兴趣'}</div>
      </div>
      {!query.isError && <span className={statusTone}>{statusLabel}</span>}
    </div>
  )

  if (query.isError) {
    return (
      <div className="screen">
        {appbar}
        <div className="body">
          <div className="card pad">
            <div className="notice" role="alert">
              <strong>{rejection ? rejection.heading : '无法加载兴趣设置'}</strong>
              <span>{rejection ? rejection.explanation : messageOf(query.error)}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {!rejection && (
                <button
                  type="button"
                  className="btn btn-ghost sm"
                  onClick={() => query.refetch()}
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
      </div>

      <div className="actionbar">
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
