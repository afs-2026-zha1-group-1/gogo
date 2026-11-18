/**
 * US-090: a one-shot, non-blocking notice handed from one page to the next through sessionStorage. Used when the
 * server refuses to switch the current trip: the user still lands on the trip, and the next screen explains that
 * the switch did not happen instead of pretending it did.
 */
const KEY = 'gogo:notice'

export function queueNotice(message: string): void {
  try {
    sessionStorage.setItem(KEY, message)
  } catch {
    // Storage unavailable (private mode): the notice is optional, never block the flow.
  }
}

export function consumeNotice(): string | null {
  try {
    const message = sessionStorage.getItem(KEY)
    if (message) sessionStorage.removeItem(KEY)
    return message
  } catch {
    return null
  }
}
