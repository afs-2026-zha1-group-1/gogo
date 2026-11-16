import { useState, type ChangeEvent, type FormEvent } from 'react'
import { api, errorMessage, type Trip, type TripCreatePayload } from '../api'
import Icon from '../Icons'

interface CreateTripProps {
  userId: number
}

const EMPTY: TripCreatePayload = {
  name: '',
  destination: '',
  startDate: '',
  endDate: '',
  startLocation: '',
  endLocation: '',
}

export default function CreateTrip({ userId }: CreateTripProps) {
  const [form, setForm] = useState<TripCreatePayload>(EMPTY)
  const [busy, setBusy] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [dateError, setDateError] = useState<boolean>(false)

  const set = (field: keyof TripCreatePayload) => (event: ChangeEvent<HTMLInputElement>) => {
    const next = { ...form, [field]: event.target.value }
    setForm(next)
    if (next.startDate && next.endDate) {
      setDateError(next.startDate > next.endDate)
    } else {
      setDateError(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (dateError) return
    setBusy(true)
    setError('')
    try {
      const result = await api<Trip>('/api/trips', { userId, method: 'POST', body: form })
      if (result.ok && result.data) {
        window.location.hash = `#/trips/${result.data.id}`
        return
      }
      const data = result.ok ? null : result.data
      setError(data?.message ? `${data.code}: ${data.message}` : `Request failed (HTTP ${result.status})`)
    } catch (cause: unknown) {
      setError(`Failed to reach the server: ${errorMessage(cause)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen">
      <header className="appbar">
        <a className="iconbtn" href="#/" aria-label="Back"><Icon name="left" /></a>
        <div className="grow">
          <div className="title">创建行程</div>
          <div className="sub">US-001 · 建立一个共享空间</div>
        </div>
      </header>
      <form className="screen" onSubmit={submit}>
        <div className="body">
          <div className="field">
            <label className="label" htmlFor="trip-name">
              <Icon name="edit" className="sm" /> 行程名称
            </label>
            <input
              id="trip-name"
              className="input"
              value={form.name}
              onChange={set('name')}
              placeholder="给这次旅行起个名字"
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="trip-destination">
              <Icon name="pin" className="sm" /> 目的地
            </label>
            <div className="inp-ic">
              <Icon name="pin" />
              <input
                id="trip-destination"
                className="input"
                value={form.destination}
                onChange={set('destination')}
                placeholder="城市 / 景区"
              />
            </div>
          </div>

          <div className="two">
            <div className="field">
              <label className="label" htmlFor="trip-start">
                <Icon name="cal" className="sm" /> 开始日期
              </label>
              <input
                id="trip-start"
                className="input"
                type="date"
                value={form.startDate}
                onChange={set('startDate')}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="trip-end">结束日期</label>
              <input
                id="trip-end"
                className={`input${dateError ? ' invalid' : ''}`}
                type="date"
                value={form.endDate}
                onChange={set('endDate')}
              />
              {dateError && (
                <div className="err-msg">
                  <Icon name="alert" className="sm" /> 结束日期不能早于开始日期
                </div>
              )}
            </div>
          </div>

          <div className="two">
            <div className="field">
              <label className="label" htmlFor="trip-from">
                <Icon name="nav" className="sm" /> 出发地
                <span className="opt">可选</span>
              </label>
              <input
                id="trip-from"
                className="input"
                value={form.startLocation}
                onChange={set('startLocation')}
                placeholder="集合出发地点"
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="trip-to">
                <Icon name="flag" className="sm" /> 返程地
                <span className="opt">可选</span>
              </label>
              <input
                id="trip-to"
                className="input"
                value={form.endLocation}
                onChange={set('endLocation')}
                placeholder="行程结束地点"
              />
            </div>
          </div>

          <div className="info-note">
            <Icon name="info" className="sm" />
            <p className="hint">
              创建后你会成为<b>组织者</b>，可邀请朋友加入。名称、目的地、日期与起终点全员可见；
              起终点也可稍后再补。
            </p>
          </div>

          {error && <p role="alert" className="error">{error}</p>}
        </div>
        <div className="actionbar">
          <button className="btn btn-primary" type="submit" disabled={busy || dateError}>
            <Icon name="plus" className="sm" />
            {busy ? '创建中…' : '创建行程'}
          </button>
        </div>
      </form>
    </div>
  )
}
