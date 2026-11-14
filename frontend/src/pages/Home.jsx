import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function Home() {
  const [greeting, setGreeting] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/greeting')
      .then(({ ok, data }) => {
        if (!ok || !data) throw new Error('request failed')
        setGreeting(data.message)
      })
      .catch((cause) => setError(`Failed to load the greeting: ${cause.message}`))
  }, [])

  if (error) return <p role="alert">{error}</p>

  return (
    <section className="card">
      <h1>{greeting}</h1>
      <p className="muted">Shared trips start here.</p>
      <a className="button" href="#/create">Create a trip</a>
    </section>
  )
}