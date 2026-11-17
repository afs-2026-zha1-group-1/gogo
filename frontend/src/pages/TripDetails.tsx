import Icon from '../Icons'
import CountdownCard from '../components/CountdownCard'
import MyPlanTimeline from '../components/MyPlanTimeline'
import { useTripOverview } from '../hooks/useTripOverview'
import { useCountdown } from '../hooks/useCountdown'
import { localEndOfDay, localMidnight } from '../lib/countdown'
import { useAuth } from '../features/auth/AuthProvider'

interface TripDetailsProps {
  tripId: number
}

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

// US-083/084/085: compact overview (hero → countdown → fellow members → 我的方案).
// The R5 blocks (trip-info list, preference card, embedded invitation panel,
// main-plan link, split-planning section) are removed; invitation moves to the
// full-screen page via the app-bar person icon, main-plan confirmation stays on
// the MainPlan page (US-081).
export default function TripDetails({ tripId }: TripDetailsProps) {
  const { account } = useAuth()
  const state = useTripOverview(tripId)

  const trip = state.kind === 'ready' ? state.trip : null
  const schedule = state.kind === 'ready' ? state.schedule : []
  const countdown = useCountdown(
    trip ? localMidnight(trip.startDate) : 0,
    schedule,
    trip ? localEndOfDay(trip.endDate) : 0,
  )

  const appbar = (
    <header className="appbar">
      <a className="iconbtn" href="#/" aria-label="Back"><Icon name="left" /></a>
      <div className="grow">
        <div className="title">行程详情</div>
        <div className="sub">US-002 · 全员可见</div>
      </div>
      {state.kind === 'ready' && (
        <a className="iconbtn" href={`#/trips/${tripId}/invitation`} aria-label="邀请朋友">
          <Icon name="user" />
        </a>
      )}
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

  const isOrganizer = state.trip.organizerId === account?.id
  const readinessText = state.readiness == null ? null
    : state.readiness.readyCount === state.readiness.memberCount ? '偏好全部就绪'
      : `${state.readiness.readyCount}/${state.readiness.memberCount} 位成员已就绪`

  return (
    <div className="screen">
      {appbar}
      <div className="body">
        <section className="hero">
          <h1 style={{ marginTop: 0 }}>{state.trip.name}</h1>
          <div className="hdest">
            <Icon name="cal" className="sm" />
            {state.trip.startDate} – {state.trip.endDate}
            <Icon name="pin" className="sm" />
            {state.trip.destination}
          </div>
        </section>

        <CountdownCard state={countdown} schedule={state.schedule} />

        {state.members.length > 0 && (
          <>
            <div className="sec-title"><Icon name="users" className="sm" /> 同行成员</div>
            <section className="card pad members-summary">
              <div className="avstack" aria-hidden="true">
                {state.members.slice(0, 4).map((member) => (
                  <div
                    className={`member-avatar tone-${((member.userId - 1) % 4) + 1}`}
                    key={member.userId}
                  >
                    {initial(member.displayName)}
                  </div>
                ))}
              </div>
              <div className="ms-main">
                <div className="ms-title">{state.members.length} 位朋友已加入</div>
                {readinessText && <div className="ms-sub">{readinessText}</div>}
              </div>
              <a className="btn btn-ghost sm" href="#/members">查看</a>
            </section>
          </>
        )}

        <MyPlanTimeline schedule={state.schedule} startDate={state.trip.startDate} isOrganizer={isOrganizer} />
      </div>
    </div>
  )
}