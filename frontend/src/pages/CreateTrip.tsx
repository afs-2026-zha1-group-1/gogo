import { useState, type ChangeEvent, type FormEvent } from 'react'
import { api, errorMessage } from '../api'
import Icon from '../Icons'
import { persistCurrentTrip } from '../lib/current-trip'
import { queueNotice } from '../lib/notice'
import { CITIES, cityForDestination, type CityOption } from './city-options'
import type { Trip, TripCreatePayload } from '../types'

interface CreateTripProps {
  backHref: string
}

const EMPTY: TripCreatePayload = {
  name: '',
  destination: '',
  startDate: '',
  endDate: '',
  startLocation: '',
  endLocation: '',
}

export default function CreateTrip({ backHref }: CreateTripProps) {
  const [form, setForm] = useState<TripCreatePayload>(EMPTY)
  const [busy, setBusy] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [dateError, setDateError] = useState<boolean>(false)
  const selectedCity = cityForDestination(form.destination)

  const set = (field: keyof TripCreatePayload) => (event: ChangeEvent<HTMLInputElement>) => {
    const next = { ...form, [field]: event.target.value }
    setForm(next)
    if (next.startDate && next.endDate) {
      setDateError(next.startDate > next.endDate)
    } else {
      setDateError(false)
    }
  }

  /**
   * Choosing a city writes the real `destination` value (which drives the hero photo) and
   * pre-fills the optional start/end landmarks, unless the member already typed their own.
   */
  function pickCity(city: CityOption) {
    setError('')
    setForm((current) => {
      const sameCity = current.destination === city.destination
      return {
        ...current,
        destination: sameCity ? '' : city.destination,
        startLocation: sameCity
          ? ''
          : current.startLocation.trim() === '' || isCityDefault(current.startLocation)
            ? city.defaultStart
            : current.startLocation,
        endLocation: sameCity
          ? ''
          : current.endLocation.trim() === '' || isCityDefault(current.endLocation)
            ? city.defaultEnd
            : current.endLocation,
      }
    })
  }

  function isCityDefault(value: string): boolean {
    return CITIES.some((city) => city.defaultStart === value || city.defaultEnd === value)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (dateError) return
    setBusy(true)
    setError('')
    try {
      const result = await api<Trip>('/api/trips', { method: 'POST', body: form })
      if (result.ok && result.data) {
        // US-090: the new trip becomes the member's current trip (replacing the previous one). A failed switch
        // never blocks the success path; the next screen explains that the current trip did not change.
        const switched = await persistCurrentTrip(result.data.id)
        if (!switched) queueNotice('当前行程未切换，可在「我的行程」中手动选择这个行程。')
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
    <div className="screen create-page">
      <header className="appbar create-appbar">
        <a className="iconbtn" href={backHref} aria-label="Back"><Icon name="left" /></a>
        <div className="grow">
          <div className="title">创建行程</div>
          <div className="sub">建立一个共享空间</div>
        </div>
      </header>
      <form className="screen" onSubmit={submit}>
        <div className="body">
          <section
            className={`create-hero${selectedCity ? ' has-photo' : ''}`}
            style={selectedCity
              ? { ['--create-photo' as string]: selectedCity.photo }
              : undefined}
          >
            <div className="create-hero-shade" aria-hidden="true" />
            <div className="create-hero-top">
              <span className="create-kicker">
                <Icon name="sparkle" className="sm" /> NEW JOURNEY
              </span>
            </div>
            <div className="create-hero-copy">
              <h1>发起一趟<br />新旅行。</h1>
              <p>选个目的地，邀请朋友，一起商量怎么玩。</p>
            </div>
          </section>

          <div className="dest-picker">
            <div className="dest-picker-head">
              <span className="dest-picker-title">想去哪里？</span>
            </div>
            <div className="dest-chips" role="radiogroup" aria-label="选择目的地城市">
              {CITIES.map((city) => {
                const active = form.destination === city.destination
                return (
                  <button
                    key={city.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`dest-chip${active ? ' on' : ''}`}
                    onClick={() => pickCity(city)}
                  >
                    {city.label}
                  </button>
                )
              })}
              <span className={`dest-chip dest-chip-other${form.destination.trim() !== '' && !selectedCity ? ' on' : ''}`}>
                其他城市
                <Icon name="right" className="sm" />
              </span>
            </div>

            <div className="inp-ic create-dest-input">
              <Icon name="pin" />
              <input
                id="trip-destination"
                className="input"
                value={form.destination}
                onChange={set('destination')}
                placeholder="也可以直接输入城市 / 景区"
                aria-label="目的地"
              />
            </div>
          </div>

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
          <button
            className="btn btn-primary create-submit"
            type="submit"
            disabled={busy || dateError || form.destination.trim() === ''}
          >
            <Icon name="plus" className="sm" />
            {busy ? '创建中…' : '发起一趟新旅行'}
          </button>
        </div>
      </form>
    </div>
  )
}