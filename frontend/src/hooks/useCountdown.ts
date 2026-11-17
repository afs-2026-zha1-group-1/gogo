/**
 * US-085 (design DD-4): one-second tick driving the pure countdown state machine.
 * Boundary switches are recomputed from the current time on every tick, so the card
 * never shows a negative value or a stale state.
 */
import { useEffect, useState } from 'react'
import { resolveCountdown, type CountdownState, type ScheduleItem } from '../lib/countdown'

export function useCountdown(departureMs: number, schedule: ScheduleItem[], tripEndMs: number): CountdownState {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return resolveCountdown(now, departureMs, schedule, tripEndMs)
}