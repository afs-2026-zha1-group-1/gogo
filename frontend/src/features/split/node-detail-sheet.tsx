import { useEffect, type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IconInfo, IconNav, IconUsers, IconX } from "@/components/icons"
import type { NodeDetailView } from "./node-detail"

/**
 * Bottom sheet for a route node (ui-design-reference Screen 11 node sheet). Content comes from
 * `node-detail.ts` (mock for now). Overlay / close button / Esc dismiss it; the graph remains visible.
 */
export function NodeDetailSheet({ detail, onClose }: { detail: NodeDetailView | null; onClose: () => void }) {
  useEffect(() => {
    if (!detail) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [detail, onClose])

  if (!detail) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="node-detail-title"
        className="max-h-[82vh] w-full max-w-[440px] overflow-y-auto rounded-t-[24px] bg-surface px-4 pt-2 pb-6 shadow-[0_-18px_50px_rgba(28,25,23,0.24)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />

        <div className="flex items-start gap-2.5">
          <Badge variant={detail.badgeVariant}>{detail.badgeLabel}</Badge>
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-bold text-ink-3">{detail.time}</div>
            <h3 id="node-detail-title" className="mt-0.5 truncate text-[16px] font-bold tracking-tight text-ink">
              {detail.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="grid size-8 shrink-0 place-items-center rounded-[9px] border border-line bg-surface text-ink-2 transition-colors hover:bg-surface-3 [&_svg]:size-4"
          >
            <IconX />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Meta icon={<IconNav />} text={detail.location} />
          <Meta icon={<IconUsers />} text={detail.people} />
          <Meta icon={<IconInfo />} text={detail.fee} />
        </div>

        <div className="mt-5 text-[11px] font-bold tracking-wide text-ink-3">需要做的事</div>
        <ol className="mt-1 flex flex-col">
          {detail.tasks.map((task, index) => (
            <li key={task} className="flex items-start gap-2.5 border-b border-line-2 py-2.5 last:border-b-0">
              <span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-surface-3 text-[11px] font-bold text-ink-2">
                {index + 1}
              </span>
              <span className="pt-0.5 text-[12.5px] leading-relaxed text-ink">{task}</span>
            </li>
          ))}
        </ol>

        <Button className="mt-5 w-full" onClick={onClose}>
          知道了
        </Button>
      </div>
    </div>
  )
}

function Meta({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border border-line bg-surface-3 px-2.5 py-1 text-[11px] font-semibold text-ink-2 [&_svg]:size-3">
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{text}</span>
    </span>
  )
}