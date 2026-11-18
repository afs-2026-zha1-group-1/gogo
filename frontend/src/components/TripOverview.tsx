import Icon from '../Icons'
import CountdownCard from './CountdownCard'
import MyPlanTimeline from './MyPlanTimeline'
import { useCountdown } from '../hooks/useCountdown'
import { localEndOfDay, localMidnight } from '../lib/countdown'
import { useAuth } from '../features/auth/AuthProvider'
import type { TripOverviewState } from '../hooks/useTripOverview'

type ReadyState = Extract<TripOverviewState, { kind: 'ready' }>

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

// US-083/084/085: compact overview (hero → countdown → fellow members → 我的方案),
// rendered by TripDetails only once a main plan exists. The R5 blocks (trip-info
// list, preference card, embedded invitation panel, main-plan link) live on the
// legacy page instead; invitation moves to the full-screen page via the app-bar
// person icon, main-plan confirmation stays on the MainPlan page (US-081).
export default function TripOverview({ state }: { state: ReadyState }) {
  const { account } = useAuth()
  const countdown = useCountdown(
    localMidnight(state.trip.startDate),
    state.schedule,
    localEndOfDay(state.trip.endDate),
  )

  const isOrganizer = state.trip.organizerId === account?.id
  const readinessText = state.readiness == null ? null
    : state.readiness.readyCount === state.readiness.memberCount ? '偏好全部就绪'
      : `${state.readiness.readyCount}/${state.readiness.memberCount} 位成员已就绪`

  return (
    <div className="screen">
      <header className="appbar">
        <a className="iconbtn" href="#/" aria-label="Back"><Icon name="left" /></a>
        <div className="grow">
          <div className="title">行程详情</div>
          <div className="sub">US-002 · 全员可见</div>
        </div>
        <a className="iconbtn" href={`#/trips/${state.trip.id}/invitation`} aria-label="邀请朋友">
          <Icon name="user" />
        </a>
      </header>
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

        <CountdownCard state={countdown} schedule={state.schedule} destination={state.trip.destination} />

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

        <MyPlanTimeline
          schedule={state.schedule}
          startDate={state.trip.startDate}
          isOrganizer={isOrganizer}
          destination={state.trip.destination}
        />
      </div>
    </div>
  )
}