import Icon from '../Icons'

export default function TripsEmpty() {
  return (
    <div className="screen">
      <header className="appbar">
        <div className="logo"><Icon name="branch" /></div>
        <div className="grow">
          <div className="title">行程</div>
          <div className="sub">还没有打开的行程</div>
        </div>
      </header>
      <div className="body">
        <section className="card pad empty-state">
          <h2>尚未选择行程</h2>
          <p className="hint">创建一个新的行程，或从仪表盘选择已有行程。</p>
          <p className="hint">行程详情即将推出；按编号打开暂不可用。</p>
          <a className="btn btn-primary" href="#/create">
            <Icon name="plus" className="sm" />
            创建行程
          </a>
          <div className="open-by-id">
            <label className="label" htmlFor="trip-id-input">按编号打开行程</label>
            <div className="row" style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <input
                id="trip-id-input"
                className="input"
                inputMode="numeric"
                placeholder="行程编号，如 1"
                disabled
                style={{ flex: '1 1 0', minWidth: 0 }}
              />
              <button className="btn btn-ghost" type="button" disabled style={{ width: 'auto', flexShrink: 0 }}>即将推出</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}