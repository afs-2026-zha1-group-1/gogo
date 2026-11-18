import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react"
import { IconX } from "@/components/icons"
import { cn } from "@/lib/utils"

/**
 * Minimal controlled modal (shadcn-style surface on the existing tokens, US-088 DD8). Used for the step-2 timing
 * failure dialog: the overlay never closes on outside click, Escape and the single close button call `onClose`, and
 * focus moves to the close button while open so the blocking message is announced before the form is reachable again.
 */
export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  initialFocus,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Optional first focus target (a form field); the close button is the default. */
  initialFocus?: RefObject<HTMLElement | null>
}) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  // Focus once per opening. This effect deliberately does not depend on the parent's callbacks: re-running it on
  // every keystroke would steal focus back to the first field while the user edits another one (US-090 编辑地点).
  useEffect(() => {
    if (!open) return
    const target = initialFocus?.current
    if (target) target.focus()
    else closeRef.current?.focus()
  }, [open, initialFocus])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "w-full max-w-[400px] overflow-hidden rounded-panel border border-line bg-surface shadow-[0_18px_50px_rgba(28,25,23,0.24)]",
        )}
      >
        <div className="flex items-start gap-3 border-b border-line-2 px-4 py-3.5">
          <div id={titleId} className="min-w-0 flex-1 text-[15px] font-bold text-ink">
            {title}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="grid size-8 shrink-0 place-items-center rounded-[9px] border border-line bg-surface text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink [&_svg]:size-3.5"
          >
            <IconX />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-4 py-3.5 text-[12.5px] leading-relaxed text-ink-2">
          {children}
        </div>
        {footer ? <div className="border-t border-line-2 px-4 py-3">{footer}</div> : null}
      </div>
    </div>
  )
}
