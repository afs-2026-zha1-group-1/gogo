/**
 * US-002 shared quick entries: a member with or without a trip sees the SAME four entries,
 * so the dashboard never changes shape after a trip is created.
 *
 * The first entry is trip-independent. The other three are trip-scoped; with no trip yet they
 * route to the trip picker (`#/my-trips`), which is the real place to obtain a trip before using
 * them — no disabled or decorative buttons are introduced.
 */
import Icon from '../Icons'

export default function DashboardQuickEntries({ tripId }: { tripId?: number | null }) {
  const scoped = (suffix: string) => (tripId != null ? `#/dashboard/trips/${tripId}/${suffix}` : '#/my-trips')

  return (
    <section aria-label="快捷入口">
      <div className="sec-title"><Icon name="list" className="sm" /> 快捷入口</div>
      <div className="dashboard-quick">
        <a className="qcard" href="#/create">
          <span className="qi"><Icon name="plus" /></span>
          <span><span className="qt">创建行程</span><span className="qd">开启新的旅程</span></span>
        </a>
        <a className="qcard" href={scoped('invite')}>
          <span className="qi"><Icon name="link" /></span>
          <span><span className="qt">邀请朋友</span><span className="qd">分享邀请链接</span></span>
        </a>
        <a className="qcard" href={scoped('preferences')}>
          <span className="qi"><Icon name="star" /></span>
          <span><span className="qt">我的偏好</span><span className="qd">查看和编辑偏好</span></span>
        </a>
        <a className="qcard" href={scoped('main-plan')}>
          <span className="qi"><Icon name="list" /></span>
          <span><span className="qt">主线方案</span><span className="qd">查看共同路线</span></span>
        </a>
      </div>
    </section>
  )
}