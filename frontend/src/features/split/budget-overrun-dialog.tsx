import { useState } from "react"
import type { BudgetOverrunDetail } from "./types"
import { Button } from "@/components/ui/button"
import { IconAlert } from "@/components/icons"
import { formatBudget, formatCost } from "@/lib/format"

/**
 * Hard-budget confirmation block dialog (US-045, Screen 15). The server rejects the confirmation with
 * SPLIT_BUDGET_HARD_OVERRUN and the exceeded amount per member. The first step offers the three ways out
 * (adjust budget / adjust activities / cancel). Choosing "调整预算" names the group and member(s) whose budget must
 * change and links straight to each one's member-preference page: their own page always, another member's page only
 * for the organizer (budgets are otherwise self-managed). Closing the dialog leaves the draft untouched.
 */
export function BudgetOverrunDialog({
  overruns,
  destination,
  viewerId,
  viewerIsOrganizer,
  onAdjustBudget,
  onEditActivities,
  onClose,
}: {
  overruns: BudgetOverrunDetail[]
  destination: string | null
  viewerId: string | null
  viewerIsOrganizer: boolean
  onAdjustBudget: (memberId: string) => void
  onEditActivities: () => void
  onClose: () => void
}) {
  const [step, setStep] = useState<"choices" | "adjust">("choices")
  const viewerOverBudget = viewerId != null && overruns.some((overrun) => overrun.memberId === viewerId)
  const canAdjust = (memberId: string) => memberId === viewerId || viewerIsOrganizer

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-overrun-title"
        className="w-full max-w-[400px] rounded-panel border border-line bg-surface p-4 shadow-xl"
      >
        <div className="flex items-start gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-err-soft text-err">
            <IconAlert />
          </span>
          <div className="min-w-0">
            <h3 id="budget-overrun-title" className="text-[14px] font-bold text-ink">
              {step === "choices"
                ? "确认被阻止：超出硬性预算"
                : viewerOverBudget
                  ? "调整预算：调整我的预算"
                  : "调整预算：需由成员本人调整"}
            </h3>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-2">
              {step === "choices"
                ? "以下成员的预计费用超过了硬性预算，请选择处理方式。"
                : viewerOverBudget
                  ? "您也在超出预算的成员之中：可打开对应成员的偏好页调整预算后重新确认。"
                  : viewerIsOrganizer
                    ? "超出预算的不是您本人：作为组织者，可直接打开对应成员的偏好页代为调整预算。"
                    : "超出预算的不是您本人：预算由成员本人设置，您无法代为调整；请通知下列对应成员调整后重新确认。"}
            </p>
          </div>
        </div>

        <ul className="mt-3 flex flex-col gap-1.5 rounded-sm border border-line-2 bg-surface-2 p-2.5">
          {overruns.map((overrun) => (
            <li key={`${overrun.memberId}-${overrun.groupLabel}`} className="text-[12px] leading-relaxed">
              <span className="font-semibold text-ink">
                {overrun.displayName ?? overrun.memberId}（{overrun.groupLabel} 组）
              </span>
              <span className="ml-1 text-ink-2">
                预计 {formatCost(overrun.totalCostCents, destination)} / 人 · 硬上限{" "}
                {formatBudget(overrun.budgetAmount, overrun.currency)} · 超出{" "}
                <b className="text-err">{formatCost(overrun.overrunCents, destination)}</b>
              </span>
              {step === "adjust" && canAdjust(overrun.memberId) ? (
                <div className="mt-1.5">
                  <Button size="sm" variant="outline" onClick={() => onAdjustBudget(overrun.memberId)}>
                    {overrun.memberId === viewerId
                      ? "打开我的偏好"
                      : `打开 ${overrun.displayName ?? "该成员"} 的偏好`}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        {step === "choices" ? (
          <div className="mt-3.5 flex flex-col gap-2">
            <Button onClick={() => setStep("adjust")}>调整预算</Button>
            <Button variant="outline" onClick={onEditActivities}>
              调整活动
            </Button>
            <Button variant="ghost" onClick={onClose}>
              取消确认
            </Button>
          </div>
        ) : (
          <div className="mt-3.5 flex flex-col gap-2">
            <Button variant="outline" onClick={() => setStep("choices")}>
              返回
            </Button>
            <Button variant="ghost" onClick={onClose}>
              取消确认
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
