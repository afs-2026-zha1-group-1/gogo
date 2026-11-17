import Icon from '../Icons'
import TripOverview from '../components/TripOverview'
import TripDetailsLegacy from './TripDetailsLegacy'
import { useTripOverview } from '../hooks/useTripOverview'

interface TripDetailsProps {
  tripId: number
}

// US-083 (2026-11-17 revision): the compact overview only takes over once a
// main plan exists. Before generation the legacy detail page (trip info,
// preference entry, invitation panel, main-plan link) stays in charge, so the
// pre-plan flow keeps its existing entries. Loading/denied/missing/failed are
// shared here; the legacy page re-reads the trip on its own (kept verbatim).
export default function TripDetails({ tripId }: TripDetailsProps) {
  const state = useTripOverview(tripId)

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

  if (state.plan == null) {
    return <TripDetailsLegacy tripId={tripId} />
  }

  return <TripOverview state={state} />
}