import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

/**
 * shadcn-style Card family mapped to the ui-design-reference surface tokens:
 * white surface, hairline border, 14px radius and a soft warm shadow. Padding is
 * opt-in (p-4 on Card, or the structured Header/Content/Footer slots).
 */
function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface shadow-[0_1px_3px_rgba(28,25,23,0.06)]",
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 p-4", className)} {...props} />
}

function CardTitle({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("text-[15px] font-bold leading-tight text-ink", className)} {...props} />
}

function CardDescription({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("text-[12.5px] leading-relaxed text-ink-2", className)} {...props} />
}

function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-4", className)} {...props} />
}

function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("flex items-center gap-2 border-t border-line-2 p-4", className)} {...props} />
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }