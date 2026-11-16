import { cn } from "@/lib/utils"

/**
 * Four-segment split-flow progress bar (ui-design-reference `.stepbar`). Segments up to `step`
 * fill with the brand teal gradient; the rest stay hairline grey. Screens 12/13/14 sit at 1/2/3.
 */
function StepBar({
  step,
  total = 4,
  className,
}: {
  step: number
  total?: number
  className?: string
}) {
  return (
    <div className={cn("flex gap-[5px]", className)}>
      {Array.from({ length: total }, (_, index) => (
        <i
          key={index}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors",
            index < step ? "bg-gradient-to-r from-brand to-brand-2" : "bg-line",
          )}
        />
      ))}
    </div>
  )
}

export { StepBar }