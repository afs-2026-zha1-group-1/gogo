import { useEffect, useState } from 'react'
import { api, errorMessage, users } from '../api'
import Icon from '../Icons'
import InvitationPanel from './InvitationPanel'
import type { Trip } from '../types'

interface TripDetailsProps {
  userId: number
  tripId: number
}

type TripState =
  | { kind: 'loading' }
  | { kind: 'ready'; trip: Trip }
  | { kind: 'denied'; message?: string }
  | { kind: 'missing'; message?: string }
  | { kind: 'failed'; message: string | undefined }

function organizerName(organizerId: number): string {
  return users().find((user) => user.id === organizerId)?.name ?? `user ${organizerId}`
}

export default function TripDetails({ userId, tripId }: TripDetailsProps) {
  const [state, setState] = useState<TripState>({ kind: 'loading' })

  useEffect(() => {
    let active = true
    setState({ kind: 'loading' })
    api<Trip>(`/api/trips/${tripId}`, { userId })
      .then((result) => {
        if (!active) return
        if (result.ok && result.data) {
          setState({ kind: 'ready', trip: result.data })
        } else if (!result.ok && result.status === 403) {
          setState({ kind: 'denied', message: result.data?.message })
        } else if (!result.ok && result.status === 404) {
          setState({ kind: 'missing', message: result.data?.message })
        } else {
          const message = result.ok ? undefined : result.data?.message
          setState({ kind: 'failed', message: message ?? `HTTP ${result.status}` })
        }
      })
      .catch((cause: unknown) => {
        if (active) setState({ kind: 'failed', message: errorMessage(cause) })
      })
    return () => {
      active = false
    }
  }, [userId, tripId])

  const appbar = (
    <header className="appbar">
      <a className="iconbtn" href="#/" aria-label="Back"><Icon name="left" /></a>
      <div className="grow">
        <div className="title">行程详情</div>
        <div className="sub">US-002 · 全员可见</div>
      </div>
    </header>
  )

  if (state.kind === 'loading') {
    return (
      <div className="screen">
        {appbar}
        <div className="body"><div className="loading">正在加载行程…</div></div>
      </div>
    )
  }

  if (state.kind !== 'ready') {
    const heading =
      state.kind === 'denied' ? '没有访问权限'
        : state.kind === 'missing' ? '行程不存在'
          : '无法加载行程'
    const explanation =
      state.kind === 'denied' ? '你不是这个行程的成员。请先通过邀请链接加入。'
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
            <a className="btn btn-ghost" href="#/">返回首页</a>
          </section>
        </div>
      </div>
    )
  }

  const trip = state.trip
  const isOrganizer = trip.organizerId === userId
  const currentUser = users().find((user) => user.id === userId)?.name

  return (
    <div className="screen">
      {appbar}
      <div className="body">
        <section className="hero">
          <div className="htop">
            <Icon name="cal" className="sm" />
            {trip.startDate} – {trip.endDate}
          </div>
          <h1>{trip.name}</h1>
          <div className="hdest">
            <Icon name="pin" className="sm" />
            {trip.destination}
          </div>
          <div className="hmeta">
            <div>出发地<b>{trip.startLocation ?? '未设置'}</b></div>
            <div>返程地<b>{trip.endLocation ?? '未设置'}</b></div>
            <div>组织者<b>{organizerName(trip.organizerId)}</b></div>
          </div>
        </section>

        <div className="sec-title"><Icon name="info" className="sm" /> 行程信息</div>
        <section className="card pad">
          <div className="valid">
            <div className="valid-item">
              <span className="valid-ic"><Icon name="cal" /></span>
              <div>
                <div className="vt">日期</div>
                <div className="vd">{trip.startDate} → {trip.endDate}</div>
              </div>
            </div>
            <div className="valid-item">
              <span className="valid-ic"><Icon name="nav" /></span>
              <div>
                <div className="vt">出发地</div>
                <div className="vd">{trip.startLocation ?? '尚未设置，可由后续主线生成补全'}</div>
              </div>
            </div>
            <div className="valid-item">
              <span className="valid-ic"><Icon name="flag" /></span>
              <div>
                <div className="vt">返程地</div>
                <div className="vd">{trip.endLocation ?? '尚未设置，可由后续主线生成补全'}</div>
              </div>
            </div>
            <div className="valid-item">
              <span className="valid-ic brand"><Icon name="user" /></span>
              <div>
                <div className="vt">组织者</div>
                <div className="vd">{organizerName(trip.organizerId)}</div>
              </div>
            </div>
          </div>
        </section>

        <InvitationPanel
          tripId={trip.id}
          userId={userId}
          isOrganizer={isOrganizer}
          userName={currentUser}
        />
      </div>
    </div>
  )
}
