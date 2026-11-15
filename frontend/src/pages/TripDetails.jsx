import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function TripDetails({ userId, tripId }) {
  const [state, setState] = useState({ kind: 'loading' })

  useEffect(() => {
    let active = true
    setState({ kind: 'loading' })
    api(`/api/trips/${tripId}`, { userId })
      .then(({ status, ok, data }) => {
        if (!active) return
        if (ok && data) setState({ kind: 'ready', trip: data })
        else if (status === 403) setState({ kind: 'denied', message: data?.message })
        else if (status === 404) setState({ kind: 'missing', message: data?.message })
        else setState({ kind: 'failed', message: data?.message ?? `HTTP ${status}` })
      })
      .catch((cause) => {
        if (active) setState({ kind: 'failed', message: cause.message })
      })
    return () => {
      active = false
    }
  }, [userId, tripId])

  if (state.kind === 'loading') return <p className="muted">Loading trip…</p>
  if (state.kind === 'denied')
    return (
      <section className="card">
        <h1>Access denied</h1>
        <p role="alert" className="error">{state.message ?? 'You are not a member of this trip.'}</p>
        <a className="button secondary" href="#/">Back home</a>
      </section>
    )
  if (state.kind === 'missing')
    return (
      <section className="card">
        <h1>Trip not found</h1>
        <p role="alert" className="error">{state.message ?? 'No trip with this id.'}</p>
        <a className="button secondary" href="#/">Back home</a>
      </section>
    )
  if (state.kind === 'failed')
    return (
      <section className="card">
        <h1>Could not load the trip</h1>
        <p role="alert" className="error">{state.message}</p>
        <a className="button secondary" href="#/">Back home</a>
      </section>
    )

  const trip = state.trip
  return (
    <section className="card">
      <h1>{trip.name}</h1>
      <dl className="details">
        <div><dt>Destination</dt><dd>{trip.destination}</dd></div>
        <div><dt>Start date</dt><dd>{trip.startDate}</dd></div>
        <div><dt>End date</dt><dd>{trip.endDate}</dd></div>
        <div><dt>Start location</dt><dd>{trip.startLocation ?? <span className="muted">Not set</span>}</dd></div>
        <div><dt>End location</dt><dd>{trip.endLocation ?? <span className="muted">Not set</span>}</dd></div>
        <div><dt>Organizer</dt><dd>user {trip.organizerId}</dd></div>
      </dl>
      <a className="button secondary" href="#/">Back home</a>
    </section>
  )
}