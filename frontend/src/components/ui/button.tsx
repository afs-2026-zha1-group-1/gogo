import type { ComponentProps } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * shadcn-style Button. Variants map the ui-design-reference btn palette: primary teal gradient, dark, ghost,
 * danger, route A blue and route B orange. Inline SVG icons inherit currentColor (no icon library).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-gradient-to-r from-brand to-brand-2 text-white shadow-sm hover:opacity-90",
        dark: "bg-ink text-white hover:bg-ink/90",
        ghost: "bg-transparent text-ink-2 hover:bg-surface-3",
        danger: "bg-err text-white hover:bg-err/90",
        a: "bg-a text-white hover:bg-a/90",
        b: "bg-b text-white hover:bg-b/90",
        outline: "border border-line bg-surface text-ink hover:bg-surface-2",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
)

function Button({
  className,
  variant,
  size,
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }