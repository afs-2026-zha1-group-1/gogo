import type { ComponentProps } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Status pill (ui-design-reference `.pill`). Color semantics are fixed by the visual authority:
 * green = pass/ready/reunion, orange = route B or pending, red = error/invalid, blue = route A,
 * teal = brand. Soft background + darker readable text + tinted hairline border.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold [&_svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "border-line bg-surface-3 text-ink-2",
        ok: "border-[#a7f3d0] bg-ok-soft text-[#047857]",
        warn: "border-[#fde68a] bg-warn-soft text-[#b45309]",
        err: "border-[#fecaca] bg-err-soft text-[#b91c1c]",
        a: "border-a-line bg-a-soft text-[#1d4ed8]",
        b: "border-b-line bg-b-soft text-[#c2410c]",
        brand: "border-[#99f6e4] bg-brand-soft text-brand-ink",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
)

function Badge({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />
}

export { Badge, badgeVariants }