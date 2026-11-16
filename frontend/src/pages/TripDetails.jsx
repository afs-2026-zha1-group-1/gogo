import { useEffect, useState } from 'react'
import { api, users } from '../api'
import Icon from '../Icons'
import InvitationPanel from './InvitationPanel.jsx'

function organizerName(organizerId) {
  return users().find((user) => user.id === organizerId)?.name ?? `user ${organizerId}`
}

export default function TripDetails({ userId, tripId }) {
  const [state, setState] = useState({ kind: 'loading' })

  useEffect(() => {
    let active = true
    setState({ kind: 'loading' })
    api(`/api/trips/${tripId}`, { userId })
      .then(({ status, ok, data }) => {
        if (!active) return
        if (ok && data) setState({ kind: 'ready', trip: data })
        else if (status === 403) setState({ kind: 'denied', message: data?.message })
        else if (status === 404) setState({ kind: 'missing', message: data?.message })
        else setState({ kind: 'failed', message: data?.message ?? `HTTP ${status}` })
      })
      .catch((cause) => {
        if (active) setState({ kind: 'failed', message: cause.message })
      })
    return () => {
      active = false
    }
  }, [userId, tripId])

  const [confirming, setConfirming] = useState(false)

  async function confirmMain() {
    setConfirming(true)
    try {
      const { ok, data } = await api(`/api/trips/${tripId}/main-plan:confirm`, { userId, method: 'POST' })
      if (ok && data) setState({ kind: 'ready', trip: data })
    } finally {
      setConfirming(false)
    }
  }

  function enterSplit() {
    try {
      localStorage.setItem('gogo.split.memberId', String(userId))
    } catch {
      /* storage unavailable */
    }
    window.location.href = `/trips/${tripId}/split`
  }

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

        <div className="sec-title"><Icon name="sparkle" className="sm" /> 旅行偏好</div>
        <section className="card pad">
          <p className="hint" style={{ marginTop: 0 }}>
            选择你在这趟旅程中喜欢的主题，保存后所有成员都能看到。
          </p>
          <a className="btn btn-primary" href={`#/trips/${trip.id}/preferences`}>
            设置我的兴趣
          </a>
        </section>

        <InvitationPanel
          tripId={trip.id}
          userId={userId}
          isOrganizer={isOrganizer}
          userName={currentUser}
        />

        <div className="sec-title" style={{ marginTop: 18 }}>分队规划</div>
        <section className="card pad">
          <p className="hint" style={{ marginBottom: 12 }}>
            主线方案确认后，可发起分队：A/B 两组分头游玩、到点会合。
          </p>
          {!trip.mainPlanConfirmed ? (
            <button className="btn btn-ghost" type="button" onClick={confirmMain} disabled={confirming}>
              {confirming ? '确认中…' : '确认主线方案'}
            </button>
          ) : (
            <div className="pill ok"><span className="dot" /> 主线已确认</div>
          )}
          <button className="btn btn-primary" type="button" style={{ marginTop: 10 }} onClick={enterSplit}>
            进入分队规划
          </button>
        </section>
      </div>
    </div>
  )
}
