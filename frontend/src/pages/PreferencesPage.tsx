import { useEffect, useState } from 'react'
import { Alert, Button, Skeleton, Space, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError } from '../api/client'
import { fetchPreferences, savePreferences } from '../api/preferences'
import { INTEREST_LABELS } from '../types/preferences'
import type { PreferencesResponse } from '../types/preferences'

interface PreferencesPageProps {
  tripId: number
  userId: number
}

interface Rejection {
  heading: string
  explanation: string
}

/** Identity, membership and trip failures get their own copy and a way back (PAGE-8). */
function rejectionOf(error: unknown): Rejection | null {
  if (!(error instanceof ApiError)) return null
  if (error.status === 401) {
    return { heading: '需要选择身份', explanation: '顶部身份选择器需要指向一个已存在的成员。' }
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

export default function PreferencesPage({ tripId, userId }: PreferencesPageProps) {
  const queryClient = useQueryClient()
  const queryKey = ['preferences', tripId, userId]
  const [selected, setSelected] = useState<string[]>([])
  const [acknowledged, setAcknowledged] = useState<string[]>([])
  const [failure, setFailure] = useState<string | null>(null)

  const query = useQuery({
    queryKey,
    queryFn: () => fetchPreferences(tripId, userId),
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
    mutationFn: (interests: string[]) => savePreferences(tripId, userId, interests),
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

  const appbar = (
    <header className="appbar">
      <div className="grow">
        <div className="title">旅行偏好</div>
        <div className="sub">US-019 · 兴趣</div>
      </div>
    </header>
  )

  if (query.isError) {
    return (
      <div className="screen">
        {appbar}
        <div className="body">
          <section className="card pad">
            <Alert
              type="error"
              showIcon
              message={rejection ? rejection.heading : '无法加载兴趣设置'}
              description={rejection ? rejection.explanation : messageOf(query.error)}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {!rejection && <Button onClick={() => query.refetch()}>重试</Button>}
              <a className="btn btn-ghost" href={`#/trips/${tripId}`}>返回行程</a>
            </div>
          </section>
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
        <section className="card pad">
          <Typography.Title level={4} style={{ marginTop: 0 }}>你的兴趣</Typography.Title>
          <Typography.Paragraph type="secondary">
            选择你在这趟旅程中喜欢的主题，保存后行程成员都能看到。
          </Typography.Paragraph>

          {query.isLoading && (
            <Typography.Paragraph type="secondary">正在加载你的选择…</Typography.Paragraph>
          )}

          {failure && (
            <Alert
              type="error"
              showIcon
              message={failure}
              style={{ marginBottom: 12 }}
            />
          )}

          <Space size={[8, 8]} wrap aria-busy={busy}>
            {INTEREST_LABELS.map((label) => (
              <Tag.CheckableTag
                key={label}
                checked={selected.includes(label)}
                onChange={() => toggle(label)}
                style={{
                  pointerEvents: busy ? 'none' : undefined,
                  opacity: busy ? 0.5 : 1,
                }}
              >
                {label}
              </Tag.CheckableTag>
            ))}
          </Space>

          <div style={{ alignItems: 'center', display: 'flex', gap: 12, marginTop: 20 }}>
            <Button
              type="primary"
              loading={mutation.isPending}
              disabled={busy}
              onClick={() => mutation.mutate(selected)}
            >
              保存
            </Button>
            <a className="btn btn-ghost" href={`#/trips/${tripId}`}>返回行程</a>
          </div>

          {query.isLoading && <Skeleton active title={false} paragraph={{ rows: 1 }} style={{ marginTop: 16 }} />}
        </section>
      </div>
    </div>
  )
}
