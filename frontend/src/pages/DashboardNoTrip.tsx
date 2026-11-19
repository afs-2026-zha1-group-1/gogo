/**
 * US-002 no-trip dashboard: a member who has just registered has no current trip, but the
 * dashboard keeps the same section flow and the SAME quick entries as the trip dashboard
 * (progress → next step → quick entries). The one honest difference is that nothing has
 * started yet, so every milestone is pending (gray), there is no trip hero, and the next
 * step offers the two real ways to get a trip: create one, or scan an invite.
 *
 * No counts or statuses are invented: the stat grid only exists when a real trip supplies them.
 */
import Icon from '../Icons'
import DashboardQuickEntries from './DashboardQuickEntries'
import { MILESTONE_ICONS, emptyMilestones } from './dashboardProgress'

export default function DashboardNoTrip() {
  const milestones = emptyMilestones()

  return (
    <>
      <section className="dashboard-progress" aria-label="旅程进度">
        <h2><Icon name="nav" className="sm" /> 旅程进度</h2>
        <div className="card pad">
          <ol>
            {milestones.map((milestone) => (
              <li
                key={milestone.label}
                data-state={milestone.state}
                aria-label={`${milestone.label}：${milestone.detail}`}
              >
                <span className="dashboard-progress-icon">
                  <Icon name={MILESTONE_ICONS[milestone.label]} className="sm" />
                </span>
                <strong>{milestone.label}</strong>
                <span>{milestone.detail}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="dashboard-next card pad" aria-label="下一步">
        <h2><Icon name="sparkle" className="sm" /> 下一步</h2>
        <h3 className="dashboard-next-title">当前还没有行程</h3>
        <p>新建一个行程组织大家，或扫码加入朋友的行程。</p>
        <a className="btn btn-primary" href="#/create">新建行程</a>
        <a className="btn btn-ghost" style={{ marginTop: 10 }} href="#/scan">扫码加入行程</a>
      </section>

      <DashboardQuickEntries />
    </>
  )
}