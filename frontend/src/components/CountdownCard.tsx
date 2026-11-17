/**
 * US-085 (design DD-5): countdown card + next-stop detail for the trip detail page.
 * Renders the pure CountdownState from useCountdown; missing address/travel inputs
 * show 待确认 instead of fabricated values (R8), and the last activity renders
 * 没有更多活动.
 */
import Icon from '../Icons'
import { formatClock, formatCountdown, type CountdownState, type ScheduleItem } from '../lib/countdown'

interface CountdownCardProps {
  state: CountdownState
  schedule: ScheduleItem[]
}

function clockValue(ms: number): string {
  const { days, hh, mm, ss } = formatCountdown(ms)
  const clock = `${hh}:${mm}:${ss}`
  return days > 0 ? `${days} 天 ${clock}` : clock
}

function timeRange(item: ScheduleItem): string {
  if (item.start == null || item.end == null) return '时间待确认'
  return `${formatClock(item.start)} – ${formatClock(item.end)}`
}

/** The member's next timed stop after the current activity (null when it is the last). */
function nextAfter(schedule: ScheduleItem[], current: ScheduleItem): ScheduleItem | null {
  const timed = timedItems(schedule)
  const index = timed.findIndex((item) => item.key === current.key)
  return index >= 0 && index < timed.length - 1 ? timed[index + 1] : null
}

function timedItems(schedule: ScheduleItem[]): ScheduleItem[] {
  return schedule
    .filter((item) => item.start != null && item.end != null)
    .sort((a, b) => (a.start ?? 0) - (b.start ?? 0))
}

function NextStopDetail({ next, travelMinutes }: { next: ScheduleItem; travelMinutes: number | null }) {
  // R8: suggested departure = next start − travel time from the current stop to the next.
  const suggestedDeparture = next.start != null && travelMinutes != null
    ? formatClock(next.start - travelMinutes * 60_000)
    : null
  return (
    <section className="card pad next-stop" aria-label="下一站详情">
      <div className="sec-title" style={{ margin: '0 0 8px' }}>
        <Icon name="nav" className="sm" /> 下一站
      </div>
      <div className="valid">
        <div className="valid-item">
          <span className="valid-ic brand"><Icon name="pin" className="sm" /></span>
          <div>
            <div className="vt">{next.name}</div>
            <div className="vd">{timeRange(next)} · {next.groupLabel ? `${next.groupLabel} 组` : '全员'}</div>
          </div>
        </div>
        <div className="valid-item">
          <span className="valid-ic"><Icon name="info" className="sm" /></span>
          <div>
            <div className="vt">地址</div>
            <div className="vd">{next.address ?? '地址待确认'}</div>
          </div>
        </div>
        <div className="valid-item">
          <span className="valid-ic"><Icon name="clock" className="sm" /></span>
          <div>
            <div className="vt">建议出发</div>
            <div className="vd">
              {suggestedDeparture != null
                ? `${suggestedDeparture}（路程 ${travelMinutes} 分钟）`
                : '待确认'}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function CountdownCard({ state, schedule }: CountdownCardProps) {
  if (state.kind === 'finished' || state.kind === 'no-schedule') {
    return (
      <section className="card pad countdown" aria-label="行程倒计时">
        <div className="countdown-label">
          <Icon name="clock" className="sm" />
          {state.kind === 'finished' ? '行程状态' : '今日安排'}
        </div>
        <div className="countdown-text">{state.kind === 'finished' ? '行程已结束' : '今日无安排'}</div>
      </section>
    )
  }

  const label = state.kind === 'pre-trip' ? '距离出发' : state.kind === 'during' ? '活动剩余' : '距下一站'
  let next: ScheduleItem | null = null
  let travelMinutes: number | null = null
  if (state.kind === 'during') {
    next = nextAfter(schedule, state.item)
    travelMinutes = state.item.travelMinutesToNext
  } else if (state.kind === 'between') {
    next = state.next
    const timed = timedItems(schedule)
    const index = timed.findIndex((item) => item.key === state.next.key)
    travelMinutes = index > 0 ? timed[index - 1].travelMinutesToNext : null
  }

  return (
    <>
      <section className="card pad countdown" aria-label="行程倒计时">
        <div className="countdown-label">
          <Icon name="clock" className="sm" /> {label}
        </div>
        <div className="countdown-value" role="timer">{clockValue(state.remainingMs)}</div>
      </section>
      {state.kind !== 'pre-trip' && (next ? <NextStopDetail next={next} travelMinutes={travelMinutes} /> : (
        <section className="card pad">
          <p className="hint" style={{ margin: 0 }}>没有更多活动</p>
        </section>
      ))}
    </>
  )
}