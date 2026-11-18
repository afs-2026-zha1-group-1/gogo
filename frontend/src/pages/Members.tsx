import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage as apiErrorMessage } from '../api'
import Icon from '../Icons'
import { isCurrentTripResponse } from '../lib/current-trip'
import type { TripMemberList } from '../types'

type MembersState =
  | { kind: 'no-trip' }
  | { kind: 'loading' }
  | { kind: 'ready'; members: TripMemberList['members'] }
  | { kind: 'denied'; message?: string }
  | { kind: 'missing'; message?: string }
  | { kind: 'failed'; message: string }

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function causeMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : String(cause)
}

interface MembersProps {
  tripId: number | null
  tripsHref: string
  tripHref: string
}

export default function Members({ tripId, tripsHref, tripHref }: MembersProps) {
  const [state, setState] = useState<MembersState>(
    tripId == null ? { kind: 'no-trip' } : { kind: 'loading' },
  )

  const load = useCallback(() => {
    let active = true
    setState({ kind: 'loading' })
    // With no explicit trip the roster follows the account's current trip, so the 成员 tab keeps working after
    // leaving the trip list (US-071/US-090 navigation).
    const run = async () => {
      let id = tripId
      if (id == null) {
        const current = await api<unknown>('/api/trips/current')
        id = current.ok && isCurrentTripResponse(current.data) ? current.data.tripId : null
      }
      if (!active) return
      if (id == null) {
        setState({ kind: 'no-trip' })
        return
      }
      const { status, ok, data } = await api<TripMemberList>(`/api/trips/${id}/members`)
      if (!active) return
      if (ok && data) setState({ kind: 'ready', members: data.members })
      else if (status === 401 || status === 403) setState({ kind: 'denied', message: apiErrorMessage(data) })
      else if (status === 404) setState({ kind: 'missing', message: apiErrorMessage(data) })
      else setState({ kind: 'failed', message: apiErrorMessage(data) ?? `HTTP ${status}` })
    }
    run().catch((cause: unknown) => {
      if (active) setState({ kind: 'failed', message: causeMessage(cause) })
    })
    return () => {
      active = false
    }
  }, [tripId])

  useEffect(() => load(), [load])

  const errorHeading =
    state.kind === 'denied' ? '没有访问权限'
      : state.kind === 'missing' ? '行程不存在'
        : '无法加载成员'
  const errorExplanation =
    state.kind === 'denied' ? '你不是这个行程的成员。请先通过邀请链接加入。'
      : state.kind === 'missing' ? '没有这个行程，或链接中的编号不正确。'
        : state.kind === 'failed' ? state.message
          : ''

  return (
    <div className="screen">
      <header className="appbar">
        <div className="logo"><Icon name="users" /></div>
        <div className="grow">
          <div className="title">成员</div>
          <div className="sub">谁已加入 · 谁是组织者</div>
        </div>
      </header>
      <div className="body">
        {state.kind === 'no-trip' && (
          <section className="card pad empty-state">
            <h2>还没有选择行程</h2>
            <p className="hint">先在「行程」页打开一个行程，再回来看成员。</p>
            <a className="btn btn-ghost" href={tripsHref}>
              <Icon name="left" className="sm" />
              去行程
            </a>
          </section>
        )}

        {state.kind === 'loading' && <div className="loading">正在加载成员…</div>}

        {(state.kind === 'denied' || state.kind === 'missing' || state.kind === 'failed') && (
          <section className="card pad">
            <div className="success-hero" style={{ paddingTop: 10 }}>
              <div className="checkring err"><Icon name="alert" className="lg" /></div>
              <h2>{errorHeading}</h2>
              <p className="hint">{errorExplanation}</p>
            </div>
            {state.kind === 'failed' && (
              <button className="btn btn-ghost" type="button" onClick={load}>重试</button>
            )}
            <a className="btn btn-ghost" href={tripHref}>返回行程</a>
          </section>
        )}

        {state.kind === 'ready' && (
          <>
            {state.members.length === 0 ? (
              <section className="card pad empty-state">
                <h2>暂无成员</h2>
                <p className="hint">这个行程还没有成员记录。</p>
                <a className="btn btn-ghost" href={tripHref}>返回行程</a>
              </section>
            ) : (
              <>
                <div className="sec-title">
                  <Icon name="users" className="sm" />
                  {state.members.length} 位成员
                </div>
                <section className="card pad" aria-label="成员列表">
                  <div className="member-list">
                    {state.members.map((member) => (
                      <div className="member-row" key={member.userId}>
                        <div
                          className={`member-avatar tone-${((member.userId - 1) % 4) + 1}`}
                          aria-hidden="true"
                        >
                          {initial(member.displayName)}
                        </div>
                        <div className="member-main">
                          <div className="member-name">{member.displayName}</div>
                          <div className="member-meta">
                            {member.organizer ? '负责确认共享方案' : '已加入'}
                          </div>
                        </div>
                        {member.organizer && (
                          <span className="pill brand">
                            <Icon name="sparkle" className="sm" />
                            组织者
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
            <p className="hint">本页只展示成员和组织者；偏好与就绪状态不在成员页。</p>
            <a className="btn btn-ghost" href={tripHref}>
              <Icon name="left" className="sm" />
              返回行程
            </a>
          </>
        )}
      </div>
    </div>
  )
}
