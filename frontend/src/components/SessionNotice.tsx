import { useEffect, useState } from 'react'
import Icon from '../Icons'
import { consumeNotice } from '../lib/notice'

/**
 * US-090: renders the one-shot session notice (for example「当前行程未切换」) after the app navigates. It reads
 * the queue on mount and on every hash change, so the page the user lands on is the one that explains the outcome.
 */
export default function SessionNotice() {
  const [message, setMessage] = useState<string | null>(() => consumeNotice())

  useEffect(() => {
    const update = () => setMessage(consumeNotice())
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])

  if (!message) return null

  return (
    <div className="info-note" role="status">
      <Icon name="info" className="sm" />
      <p className="hint">{message}</p>
      <button className="btn btn-ghost sm" type="button" onClick={() => setMessage(null)}>
        知道了
      </button>
    </div>
  )
}
