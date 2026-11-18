import { useState, type FormEvent } from 'react'
import Icon from '../Icons'

export default function TripsEmpty() {
  const [tripId, setTripId] = useState('')
  const [error, setError] = useState('')

  function openTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = tripId.trim()
    const id = Number(value)
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id <= 0) {
      setError('请输入有效的行程编号。')
      return
    }
    window.location.hash = `#/trips/${id}`
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
          <form className="open-by-id" onSubmit={openTrip} noValidate>
            <label className="label" htmlFor="trip-id-input">按编号打开行程</label>
            <div className="row" style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <input
                id="trip-id-input"
                className="input"
                inputMode="numeric"
                placeholder="行程编号，如 1"
                value={tripId}
                onChange={(event) => {
                  setTripId(event.target.value)
                  setError('')
                }}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'trip-id-error' : undefined}
                style={{ flex: '1 1 0', minWidth: 0 }}
              />
              <button className="btn btn-ghost" type="submit" style={{ width: 'auto', flexShrink: 0 }}>打开行程</button>
            </div>
            {error && <p id="trip-id-error" role="alert" className="error">{error}</p>}
          </form>
        </section>
      </div>
    </div>
  )
}