import type { ComponentProps } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Selectable chip (ui-design-reference `.chip`). Used for the boundary stop pickers, which the
 * visual authority renders as single-select chip groups (not a dropdown). Selected chips invert
 * to solid ink / route-A blue / route-B orange.
 */
const chipVariants = cva(
  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      tone: {
        neutral: "border-line bg-surface text-ink-2 hover:border-ink-3",
        a: "border-line bg-surface text-ink-2 hover:border-a",
        b: "border-line bg-surface text-ink-2 hover:border-b",
      },
      selected: { true: "", false: "" },
    },
    compoundVariants: [
      { tone: "neutral", selected: true, class: "border-ink bg-ink text-white hover:border-ink" },
      { tone: "a", selected: true, class: "border-a bg-a text-white hover:border-a" },
      { tone: "b", selected: true, class: "border-b bg-b text-white hover:border-b" },
    ],
    defaultVariants: { tone: "neutral", selected: false },
  },
)

function Chip({
  className,
  tone,
  selected,
  ...props
}: ComponentProps<"button"> & VariantProps<typeof chipVariants>) {
  return <button type="button" className={cn(chipVariants({ tone, selected, className }))} {...props} />
}

export { Chip, chipVariants }