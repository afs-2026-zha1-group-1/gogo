import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Validation / breakdown row (ui-design-reference `.valid-item`): a tinted circular icon, a title,
 * an optional description and an optional trailing value. Tone drives the icon colors so pass/fail/
 * wait and route-A/route-B rows read at a glance. Used by the rules card and the timing breakdown.
 */
type Tone = "pass" | "fail" | "warn" | "neutral" | "a" | "b"

const toneClass: Record<Tone, string> = {
  pass: "bg-ok-soft text-ok",
  fail: "bg-err-soft text-err",
  warn: "bg-warn-soft text-warn",
  neutral: "bg-surface-3 text-ink-2",
  a: "bg-a-soft text-a",
  b: "bg-b-soft text-b",
}

function ValidItem({
  icon,
  title,
  description,
  tone = "neutral",
  trailing,
  className,
}: {
  icon: ReactNode
  title: ReactNode
  description?: ReactNode
  tone?: Tone
  trailing?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 border-b border-line-2 py-2.5 last:border-b-0",
        className,
      )}
    >
      <span
        className={cn(
          "mt-px grid size-[22px] shrink-0 place-items-center rounded-full [&_svg]:size-3.5",
          toneClass[tone],
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-ink">{title}</div>
        {description ? <div className="mt-0.5 text-[11.5px] text-ink-3">{description}</div> : null}
      </div>
      {trailing ? <div className="shrink-0 text-[11.5px] font-bold text-ink-2">{trailing}</div> : null}
    </div>
  )
}

function ValidList({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col", className)} {...props} />
}

export { ValidItem, ValidList }