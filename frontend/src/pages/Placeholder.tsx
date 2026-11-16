import Icon from '../Icons'

export default function Placeholder({ title, tripsHref }: { title: string; tripsHref: string }) {
  return (
    <div className="screen">
      <header className="appbar">
        <div className="logo"><Icon name="branch" /></div>
        <div className="grow">
          <div className="title">{title}</div>
          <div className="sub">规划中</div>
        </div>
      </header>
      <div className="body">
        <section className="card pad empty-state">
          <h2>{title}</h2>
          <p className="hint">该功能尚未实现，敬请期待。</p>
          <a className="btn btn-ghost" href={tripsHref}>
            <Icon name="left" className="sm" />
            返回行程
          </a>
        </section>
      </div>
    </div>
  )
}