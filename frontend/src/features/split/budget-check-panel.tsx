import type { BudgetCheck, BudgetMemberVerdict, GroupBudget } from "./types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconAlert } from "@/components/icons"
import { formatBudget, formatCost } from "@/lib/format"
import { cn } from "@/lib/utils"

const STATUS_BADGE: Record<BudgetMemberVerdict["status"], { label: string; variant: "ok" | "warn" | "err" | "neutral" }> = {
  within: { label: "在预算内", variant: "ok" },
  soft_over: { label: "超软性预算", variant: "warn" },
  hard_over: { label: "超硬性预算", variant: "err" },
  no_budget: { label: "未设预算", variant: "neutral" },
}

function budgetText(member: BudgetMemberVerdict): string {
  if (member.budgetAmount == null) return "未设置"
  const limit = member.limitType === "soft" ? "软上限" : "硬上限"
  return `${formatBudget(member.budgetAmount, member.currency)}（${limit}）`
}

/**
 * Screen 15 budget projection (US-045). It only renders the backend verdict: the remaining shared cost, the
 * replaced activities (shown for transparency, never added again), each group's squad cost and every member's
 * total against their stored budget. The header badge carries the overall state (hard block / soft reminder / in
 * budget); no extra reminder blocks are rendered, so the page stays compact. A soft reminder only appears for an
 * overrun of 20% or more above the stated soft amount (backend verdict). The screen never recomputes the arithmetic
 * itself.
 */
export function BudgetCheckPanel({
  check,
  loading,
  error,
  destination,
}: {
  check: BudgetCheck | null | undefined
  loading: boolean
  error: unknown
  destination: string | null
}) {
  if (loading) {
    return (
      <Card className="p-3.5">
        <div className="text-[13px] font-bold text-ink">费用与预算检查</div>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">正在核算分队费用与剩余共享费用…</p>
      </Card>
    )
  }
  if (error || !check) {
    return (
      <Card className="border-[#fde68a] bg-warn-soft p-3.5">
        <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#b45309]">
          <IconAlert className="size-3.5" /> 费用检查不可用
        </div>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-2">
          确认时后端仍会重新核算；若存在硬性超预算，确认会被阻止并显示超出金额。
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-bold text-ink">费用与预算检查</span>
        <Badge variant={check.blocked ? "err" : check.softReminder ? "warn" : "ok"}>
          {check.blocked ? "硬性超预算" : check.softReminder ? "软性超预算提醒" : "预算内"}
        </Badge>
      </div>

      <dl className="mt-2 flex flex-col gap-1 text-[12px]">
        <Row label="仍适用的共享费用" value={`${formatCost(check.remainingSharedCostCents, destination)} / 人`} />
        <Row
          label="已被分队替换的活动（不重复计入）"
          value={`${formatCost(check.replacedCostCents, destination)} / 人`}
          muted
        />
        {check.groups.map((group) => (
          <Row
            key={group.groupLabel}
            label={`${group.groupLabel} 组分队活动`}
            value={`${formatCost(group.squadCostCents, destination)} / 人`}
          />
        ))}
      </dl>

      <p className="mt-2 text-[10.5px] leading-relaxed text-ink-3">
        每人合计 = 仍适用的共享费用 + 所在组分队活动；被替换的共享活动只列出、不再相加。
      </p>

      <div className="mt-2.5 flex flex-col gap-2">
        {check.groups.map((group) => (
          <GroupBlock key={group.groupLabel} group={group} destination={destination} />
        ))}
      </div>
    </Card>
  )
}

function GroupBlock({ group, destination }: { group: GroupBudget; destination: string | null }) {
  return (
    <div className="rounded-sm border border-line-2 bg-surface-2 p-2.5">
      <div className="flex items-center justify-between gap-2 text-[11.5px] font-semibold text-ink-2">
        <span>
          {group.groupLabel} 组合计 {formatCost(group.totalCostCents, destination)} / 人
        </span>
      </div>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {group.members.length === 0 ? (
          <li className="text-[11px] text-ink-3">暂无成员</li>
        ) : (
          group.members.map((member) => (
            <li key={member.memberId} className="flex items-center gap-2 text-[12px]">
              <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                {member.displayName ?? member.memberId}
              </span>
              <span className="shrink-0 text-[11px] text-ink-3">{budgetText(member)}</span>
              <Badge variant={STATUS_BADGE[member.status].variant}>
                {member.status === "within" || member.status === "no_budget"
                  ? STATUS_BADGE[member.status].label
                  : `${STATUS_BADGE[member.status].label} ${formatCost(member.overrunCents, destination)}`}
              </Badge>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className={cn("text-ink-3", muted && "line-through decoration-ink-3/60")}>{label}</dt>
      <dd className={cn("shrink-0 font-semibold text-ink", muted && "text-ink-2")}>{value}</dd>
    </div>
  )
}
