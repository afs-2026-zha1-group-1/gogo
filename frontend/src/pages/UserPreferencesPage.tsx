import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import Icon from '../Icons'
import { fetchUserInterests, saveUserInterests } from '../api/preferences'
import { INTEREST_OPTIONS } from '../types/preferences'
import type { UserInterestsResponse } from '../types/preferences'

/**
 * US-019 personal default interests, reached from "我的 → 偏好设置". This page only sets the
 * defaults; each trip's preferences page pre-selects them (without saving) when the member has
 * no saved interests yet. It never writes a trip's member_preference rows.
 */
export default function UserPreferencesPage() {
  const queryClient = useQueryClient()
  const key = ['user-interests']
  const [selected, setSelected] = useState<string[]>([])
  const [acknowledged, setAcknowledged] = useState<string[]>([])
  const [failure, setFailure] = useState<string | null>(null)

  const query = useQuery({ queryKey: key, queryFn: fetchUserInterests })

  useEffect(() => {
    if (!query.data) return
    setSelected(query.data.interests)
    setAcknowledged(query.data.interests)
    setFailure(null)
  }, [query.data])

  const mutation = useMutation({
    mutationFn: (interests: string[]) => saveUserInterests(interests),
    onSuccess: (response) => {
      setSelected(response.interests)
      setAcknowledged(response.interests)
      setFailure(null)
      queryClient.setQueryData<UserInterestsResponse>(key, response)
    },
    onError: (error) => {
      setSelected(acknowledged)
      setFailure(error instanceof Error ? error.message : '保存失败，请重试')
    },
  })

  const busy = query.isLoading || mutation.isPending
  const dirty =
    selected.length !== acknowledged.length ||
    selected.some((label) => !acknowledged.includes(label))

  const toggle = (label: string) => {
    if (busy) return
    setFailure(null)
    setSelected((current) =>
      current.includes(label) ? current.filter((value) => value !== label) : [...current, label],
    )
  }

  const statusLabel = query.isLoading
    ? '加载中'
    : mutation.isPending
      ? '保存中'
      : dirty
        ? '未保存'
        : '已保存'

  return (
    <div className="screen">
      <div className="appbar">
        <a className="iconbtn" href="#/account" aria-label="返回我的">
          <Icon name="left" />
        </a>
        <div className="grow">
          <div className="title">偏好设置</div>
          <div className="sub">我的默认兴趣 · US-019</div>
        </div>
        {!query.isError && <span className={!busy && !dirty ? 'pill ok' : 'pill'}>{statusLabel}</span>}
      </div>
      <div className="body">
        <div className="sec-title">
          <Icon name="star" className="sm" /> 我的偏好（默认勾选）
        </div>

        {query.isLoading ? (
          <p className="hint">正在加载你的默认偏好…</p>
        ) : query.isError ? (
          <div className="notice" role="alert">
            <strong>无法加载默认偏好</strong>
            <span>{query.error instanceof Error ? query.error.message : '请稍后重试'}</span>
          </div>
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
          设好默认偏好后，之后每个行程的偏好页会先自动勾选这些兴趣（仍是未保存，你可随时改再存）。
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
          {mutation.isPending ? '正在保存…' : '保存默认偏好'}
        </button>
      </div>
    </div>
  )
}
