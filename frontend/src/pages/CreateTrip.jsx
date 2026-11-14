import { useState } from 'react'
import { api } from '../api.js'

const EMPTY = {
  name: '',
  destination: '',
  startDate: '',
  endDate: '',
  startLocation: '',
  endLocation: '',
}

export default function CreateTrip({ userId }) {
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value })

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { status, ok, data } = await api('/api/trips', { userId, method: 'POST', body: form })
      if (ok && data) {
        window.location.hash = `#/trips/${data.id}`
        return
      }
      setError(data?.message ? `${data.code}: ${data.message}` : `Request failed (HTTP ${status})`)
    } catch (cause) {
      setError(`Failed to reach the server: ${cause.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <h1>Create a trip</h1>
      <form onSubmit={submit}>
        <label>
          Trip name
          <input value={form.name} onChange={set('name')} placeholder="Singapore Friends Day" />
        </label>
        <label>
          Destination
          <input value={form.destination} onChange={set('destination')} placeholder="Singapore" />
        </label>
        <div className="row">
          <label>
            Start date
            <input type="date" value={form.startDate} onChange={set('startDate')} />
          </label>
          <label>
            End date
            <input type="date" value={form.endDate} onChange={set('endDate')} />
          </label>
        </div>
        <label>
          Start location <span className="muted">(optional)</span>
          <input value={form.startLocation} onChange={set('startLocation')} placeholder="City Hall MRT" />
        </label>
        <label>
          End location <span className="muted">(optional)</span>
          <input value={form.endLocation} onChange={set('endLocation')} placeholder="Merlion Park" />
        </label>
        {error && <p role="alert" className="error">{error}</p>}
        <button className="button" type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create trip'}
        </button>
      </form>
    </section>
  )
}