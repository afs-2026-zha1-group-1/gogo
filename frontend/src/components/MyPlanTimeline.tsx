/**
 * US-083/084 (design DD-5): embedded 我的方案 timeline. Renders the derived schedule
 * (main-plan stops or the member's confirmed personal route) with the MainPlan page's
 * tl-* markup pattern; an empty schedule shows the no-plan state, never another
 * trip's or another group's route. US-090: a main-plan stop carries an edit entry
 * (pencil) that opens the name/time/note dialog; a split node opens the
 * round-scoped node dialog instead (both update the route graph after saving),
 * and both carry the trash entry (deleting a group's last step keeps it on the main line).
 * US-079: every stop card carries a mint Amap button on its right opening the
 * embedded map modal; the address + navigation live on the countdown card's
 * next-stop row, not on the timeline; map failures never blank the trip.
 */
import { useState } from 'react'
import Icon from '../Icons'
import StopMapButton from './StopMapButton'
import { formatClock, stopVisualState, type CountdownState, type ScheduleItem, type StopState } from '../lib/countdown'
import { activityCostCents, formatActivityCost } from '../lib/activity-cost'
import { stopPhoto } from '../lib/stop-photo'
import {
  dayIndexOfInstant,
  dayLabel,
  defaultDayIndex,
  groupByDay,
  shortDayLabel,
  weekdayLabel,
} from '../lib/day-groups'
import { stopIcon } from '../lib/stop-icon'

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
  /** US-079: trip destination passed to the embedded Amap modal. */
  destination: string
  /** US-083: resolved countdown state; only used to label current/next/done stops visually. */
  countdown?: CountdownState
}

/** Above this many days the tab row would crowd the title, so it collapses into a date select. */
const PAGER_TAB_LIMIT = 6

const STATE_LABEL: Record<StopState, string> = {
  current: '进行中',
  next: '下一站',
  done: '已完成',
  upcoming: '未开始',
}

function timeLabel(item: ScheduleItem): string {
  if (item.start == null || item.end == null) return '时间待确认'
  if (item.kind === 'split-departure') return `${formatClock(item.start)} · 分头`
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
  destination,
  countdown,
}: MyPlanTimelineProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const groups = groupByDay(schedule, (item) => item.dayIndex ?? dayIndexOfInstant(item.start, startDate))
  const todayDay = dayIndexOfInstant(Date.now(), startDate)
  const defaultDay = defaultDayIndex(groups.map((group) => group.dayIndex), todayDay)
  const activeDay = selectedDay != null && groups.some((group) => group.dayIndex === selectedDay)
    ? selectedDay
    : defaultDay
  const activeGroup = groups.find((group) => group.dayIndex === activeDay) ?? groups[0]
  const showPager = groups.length > 1
  const showTabs = groups.length <= PAGER_TAB_LIMIT

  return (
    <>
      <div className="plan-head">
        <div className="sec-title"><Icon name="list" className="sm" /> 我的方案</div>
        {showPager && (showTabs ? (
          <div className="day-pager" role="tablist" aria-label="按天切换行程">
            {groups.map((group) => (
              <button
                key={group.dayIndex}
                type="button"
                role="tab"
                id={`day-tab-${group.dayIndex}`}
                className="day-tab"
                title={dayLabel(startDate, group.dayIndex)}
                aria-label={dayLabel(startDate, group.dayIndex)}
                aria-selected={group.dayIndex === activeGroup?.dayIndex}
                aria-controls={group.dayIndex === activeGroup?.dayIndex
                  ? `day-panel-${group.dayIndex}`
                  : undefined}
                onClick={() => setSelectedDay(group.dayIndex)}
              >
                {shortDayLabel(startDate, group.dayIndex)}
              </button>
            ))}
          </div>
        ) : (
          <div className="day-select">
            <select
              value={activeGroup?.dayIndex ?? ''}
              aria-label="选择行程日期"
              aria-controls={`day-panel-${activeGroup?.dayIndex}`}
              onChange={(event) => setSelectedDay(Number(event.target.value))}
            >
              {groups.map((group) => (
                <option key={group.dayIndex} value={group.dayIndex}>
                  {`${shortDayLabel(startDate, group.dayIndex)} ${weekdayLabel(startDate, group.dayIndex)}`}
                </option>
              ))}
            </select>
            <Icon name="right" className="sm day-select-chevron" />
          </div>
        ))}
      </div>
      {schedule.length === 0 ? (
        <section className="card pad empty-state">
          <h2>还没有方案</h2>
          <p className="hint">
            {isOrganizer
              ? '全员就绪后，可在仪表盘生成主线方案；生成后会自动显示在这里。'
              : '组织者还没有生成方案，生成后会自动显示在这里。'}
          </p>
        </section>
      ) : activeGroup ? (
        <>
          <div className="sec-title day-tag">
            <Icon name="clock" className="sm" /> {dayLabel(startDate, activeGroup.dayIndex)}
          </div>
          <div
            className="timeline"
            id={`day-panel-${activeGroup.dayIndex}`}
            role={showPager && showTabs ? 'tabpanel' : undefined}
            aria-labelledby={showPager && showTabs ? `day-tab-${activeGroup.dayIndex}` : undefined}
          >
            {activeGroup.items.map((item, index) => {
              // 金额按行实时算：有存库金额用存库，演示城市回退 mock，未知则不报价（不再一律写「免费」）。
              const costLabel = formatActivityCost(activityCostCents(item.name, item.costCents), destination)
              // 珠海 / 香港的活动有实景图；AI 生成的其他目的地返回 null，仍用图标块。
              const photo = stopPhoto(item.name, destination)
              return (
              <div
                className="tl-item"
                key={item.key}
                data-stop-state={countdown ? stopVisualState(item, countdown) : undefined}
              >
                <div className="tl-rail">
                  <div className="tl-node" />
                  {index < activeGroup.items.length - 1 && <div className="tl-line" />}
                </div>
                <div className="tl-card">
                  <div className="tl-time">
                    <span>{timeLabel(item)}</span>
                    {countdown && (() => {
                      const visual = stopVisualState(item, countdown)
                      // 未开始是默认态，不额外加徽章，避免每条都挂标签。
                      if (visual === 'upcoming') return null
                      return (
                        <span className={`stop-state-badge${visual === 'next' ? ' next' : visual === 'done' ? ' done' : ''}`}>
                          <Icon name={visual === 'done' ? 'check' : visual === 'current' ? 'clock' : 'nav'} className="sm" />
                          {STATE_LABEL[visual]}
                        </span>
                      )
                    })()}
                  </div>
                  <div className="act-card">
                    {photo ? (
                      <img
                        className="stop-photo"
                        src={photo.src}
                        alt={photo.alt}
                        loading="lazy"
                        width={420}
                        height={315}
                      />
                    ) : (
                      <span className="act-ic">
                        <Icon name={stopIcon(item)} className="sm" />
                      </span>
                    )}
                    <div className="act-main">
                      <div className="act-name">{item.name}</div>
                      <div className="act-sub">
                        {item.kind === 'split-departure'
                          ? '全员 · 分头'
                          : [item.note, item.groupLabel ? `${item.groupLabel} 组` : '全员', costLabel]
                              .filter(Boolean)
                              .join(' · ')}
                      </div>
                    </div>
                    {(item.stopId != null || item.splitStep != null) && onEditStop ? (
                      <button
                        type="button"
                        className="tl-edit"
                        disabled={busy}
                        aria-label={`编辑 ${item.name}`}
                        onClick={() => onEditStop(item)}
                      >
                        <Icon name="edit" className="sm" />
                      </button>
                    ) : null}
                    {(item.stopId != null || item.splitStep != null) && onDeleteStop ? (
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
                    <StopMapButton
                      item={item}
                      destination={destination}
                      from={index > 0 ? activeGroup.items[index - 1] : null}
                    />
                    {item.interests.length > 0 && (
                      <div className="chips act-tags">
                        {item.interests.map((tag) => (
                          <span className="pill" key={tag}><Icon name="star" className="sm" /> {tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {item.travelMinutesToNext != null && (
                    <div className="tl-leg">
                      <Icon name="nav" className="sm" /> 前往下一站 · {item.travelMinutesToNext} 分钟
                    </div>
                  )}
                </div>
              </div>
              )
            })}
          </div>
          {onAddStop ? (
            <button type="button" className="tl-add" disabled={busy} onClick={onAddStop}>
              <Icon name="plus" className="sm" /> 添加节点
            </button>
          ) : null}
        </>
      ) : null}
    </>
  )
}
