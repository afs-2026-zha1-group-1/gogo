import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage as apiErrorMessage } from '../api'
import Icon from '../Icons'
import { isCurrentTripResponse } from '../lib/current-trip'
import type { TripMemberList } from '../types'
import type { MemberProfile } from '../types/preferences'

type MembersState =
  | { kind: 'no-trip' }
  | { kind: 'loading' }
  | { kind: 'ready'; members: TripMemberList['members']; profiles: MemberProfile[] }
  | { kind: 'denied'; message?: string }
  | { kind: 'missing'; message?: string }
  | { kind: 'failed'; message: string }

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function causeMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : String(cause)
}

// Budgets are stored in major units; the symbol follows the member's own currency code.
const CURRENCY_SYMBOLS: Record<string, string> = {
  SGD: 'S$',
  CNY: '¥',
  USD: 'US$',
  EUR: '€',
  JPY: 'JP¥',
}

function budgetText(profile: MemberProfile | undefined) {
  if (!profile || !profile.budget) return '未设预算'
  const { amount, currency, limitType } = profile.budget
  const symbol = CURRENCY_SYMBOLS[currency]
  return `${symbol ? `${symbol}${amount}` : `${currency} ${amount}`} · ${limitType === 'hard' ? '硬上限' : '软上限'}`
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
      // Roster + each member's preference summary (US-045 follow-up); one retry reloads both.
      const [roster, profiles] = await Promise.all([
        api<TripMemberList>(`/api/trips/${id}/members`),
        api<{ members: MemberProfile[] }>(`/api/trips/${id}/preferences/members`),
      ])
      if (!active) return
      if (roster.ok && roster.data && profiles.ok && profiles.data) {
        setState({ kind: 'ready', members: roster.data.members, profiles: profiles.data.members })
      } else if (roster.status === 401 || roster.status === 403) {
        setState({ kind: 'denied', message: apiErrorMessage(roster.data) })
      } else if (roster.status === 404) {
        setState({ kind: 'missing', message: apiErrorMessage(roster.data) })
      } else {
        const failure = !roster.ok ? roster : profiles
        setState({ kind: 'failed', message: apiErrorMessage(failure.data) ?? `HTTP ${failure.status}` })
      }
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
          <div className="sub">谁已加入 · 偏好与预算一览</div>
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
                    {state.members.map((member) => {
                      const profile = state.profiles.find((item) => item.userId === member.userId)
                      const tags = profile?.interests ?? []
                      return (
                        <div className="member-row" key={member.userId} style={{ alignItems: 'flex-start' }}>
                          <div
                            className={`member-avatar tone-${((member.userId - 1) % 4) + 1}`}
                            aria-hidden="true"
                          >
                            {initial(member.displayName)}
                          </div>
                          <div className="member-main">
                            <div className="member-name">
                              {member.displayName}
                              {member.organizer && (
                                <span className="pill brand" style={{ marginLeft: 8 }}>
                                  <Icon name="sparkle" className="sm" />
                                  组织者
                                </span>
                              )}
                            </div>
                            <div className="member-meta">
                              {member.organizer ? '负责确认共享方案' : '已加入'}
                              <span style={{ margin: '0 6px', opacity: 0.5 }}>·</span>
                              {budgetText(profile)}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                              {tags.length === 0 ? (
                                <span className="hint" style={{ fontSize: 11 }}>未选择兴趣</span>
                              ) : (
                                tags.map((tag) => (
                                  <span className="pill" key={tag} style={{ fontSize: 10.5 }}>
                                    {tag}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                          {tripId != null && (
                            <a
                              className="btn btn-ghost sm"
                              style={{ alignSelf: 'center', whiteSpace: 'nowrap' }}
                              href={`#/trips/${tripId}/members/${member.userId}/preferences`}
                            >
                              偏好设置
                            </a>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              </>
            )}
            <p className="hint">点「偏好设置」可查看该成员的兴趣与预算；组织者可直接编辑，其他成员只读。</p>
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
