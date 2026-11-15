import { useState } from 'react'
import Icon from '../Icons.jsx'

export default function TripsEmpty() {
  const [id, setId] = useState('')
  const [error, setError] = useState('')

  function openById(event) {
    event.preventDefault()
    const trimmed = id.trim()
    if (!/^\d+$/.test(trimmed)) {
      setError('请输入数字行程编号')
      return
    }
    window.location.hash = `#/trips/${Number(trimmed)}`
  }

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
          <p className="hint">创建一个新的行程，或按编号打开已有行程。</p>
          <a className="btn btn-primary" href="#/create">
            <Icon name="plus" className="sm" />
            创建行程
          </a>
          <form className="open-by-id" onSubmit={openById}>
            <label className="label" htmlFor="trip-id-input">按编号打开行程</label>
            <div className="row">
              <input
                id="trip-id-input"
                className="input"
                inputMode="numeric"
                placeholder="行程编号，如 1"
                value={id}
                onChange={(event) => { setId(event.target.value); setError('') }}
              />
              <button className="btn btn-ghost" type="submit">打开</button>
            </div>
            {error && (
              <div className="err-msg">
                <Icon name="alert" className="sm" /> {error}
              </div>
            )}
          </form>
        </section>
      </div>
    </div>
  )
}