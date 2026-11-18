/**
 * US-083/084 (design DD-5): embedded 我的方案 timeline. Renders the derived schedule
 * (main-plan stops or the member's confirmed personal route) with the MainPlan page's
 * tl-* markup pattern; an empty schedule shows the no-plan state, never another
 * trip's or another group's route. US-090: a main-plan stop carries an edit entry
 * (pencil) that opens the time/location dialog; split route items stay read-only.
 */
import Icon from '../Icons'
import { formatClock, type ScheduleItem } from '../lib/countdown'

interface MyPlanTimelineProps {
  schedule: ScheduleItem[]
  startDate: string
  isOrganizer: boolean
  /** Present only when the schedule comes from the main plan and the member may edit it. */
  onEditStop?: (item: ScheduleItem) => void
  /** Present only when the plan has more than one stop (US-090 删除节点). */
  onDeleteStop?: (item: ScheduleItem) => void
  /** Present when the member may append a stop (US-090 新增节点). */
  onAddStop?: () => void
  /** A stop mutation is in flight: the entry buttons are disabled so a double click cannot post twice. */
  busy?: boolean
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function dayLabel(startDate: string): string {
  const [year, month, day] = startDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return `DAY 1 · ${month}月${day}日（周${WEEKDAYS[date.getDay()]}）`
}

function timeLabel(item: ScheduleItem): string {
  if (item.start == null || item.end == null) return '时间待确认'
  return `${formatClock(item.start)} – ${formatClock(item.end)}`
}

export default function MyPlanTimeline({
  schedule,
  startDate,
  isOrganizer,
  onEditStop,
  onDeleteStop,
  onAddStop,
  busy = false,
}: MyPlanTimelineProps) {
  return (
    <>
      <div className="sec-title"><Icon name="list" className="sm" /> 我的方案</div>
      {schedule.length === 0 ? (
        <section className="card pad empty-state">
          <h2>还没有方案</h2>
          <p className="hint">
            {isOrganizer
              ? '全员就绪后，可在仪表盘生成主线方案；生成后会自动显示在这里。'
              : '组织者还没有生成方案，生成后会自动显示在这里。'}
          </p>
        </section>
      ) : (
        <>
          <div className="sec-title day-tag"><Icon name="clock" className="sm" /> {dayLabel(startDate)}</div>
          <div className="timeline">
            {schedule.map((item, index) => (
              <div className="tl-item" key={item.key}>
                <div className="tl-rail">
                  <div className="tl-node" />
                  {index < schedule.length - 1 && <div className="tl-line" />}
                </div>
                <div className="tl-card">
                  <div className="tl-time">{timeLabel(item)}</div>
                  <div className="act-card">
                    <span className="act-ic">
                      <Icon name={item.groupLabel ? 'route' : 'pin'} className="sm" />
                    </span>
                    <div className="act-main">
                      <div className="act-name">{item.name}</div>
                      <div className="act-sub">
                        {item.location ? `${item.location} · ` : ''}
                        {item.groupLabel ? `${item.groupLabel} 组` : '全员'} · 免费
                      </div>
                      {item.interests.length > 0 && (
                        <div className="chips" style={{ marginTop: 6 }}>
                          {item.interests.map((tag) => (
                            <span className="pill" key={tag}><Icon name="star" className="sm" /> {tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {item.stopId != null && onEditStop ? (
                      <button
                        type="button"
                        className="tl-edit"
                        disabled={busy}
                        aria-label={`编辑 ${item.name} 的时间与地点`}
                        onClick={() => onEditStop(item)}
                      >
                        <Icon name="edit" className="sm" />
                      </button>
                    ) : null}
                    {item.stopId != null && onDeleteStop ? (
                      <button
                        type="button"
                        className="tl-edit tl-edit-danger"
                        disabled={busy}
                        aria-label={`删除 ${item.name}`}
                        onClick={() => onDeleteStop(item)}
                      >
                        <Icon name="trash" className="sm" />
                      </button>
                    ) : null}
                  </div>
                  {item.travelMinutesToNext != null && (
                    <div className="tl-leg">
                      <Icon name="nav" className="sm" /> 前往下一站 · {item.travelMinutesToNext} 分钟
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {onAddStop ? (
            <button type="button" className="tl-add" disabled={busy} onClick={onAddStop}>
              <Icon name="plus" className="sm" /> 添加节点
            </button>
          ) : null}
        </>
      )}
    </>
  )
}