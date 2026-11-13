import { useEffect, useState } from 'react'

export default function App() {
  const [greeting, setGreeting] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/greeting')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((data) => setGreeting(data.message))
      .catch((cause) => setError(`Failed to load the greeting: ${cause.message}`))
  }, [])

  if (error) return <p role="alert">{error}</p>

  return <h1>{greeting}</h1>
}
