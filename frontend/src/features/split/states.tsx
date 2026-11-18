import type { ReactNode } from "react"
import { SplitApiError } from "./api"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IconAlert, IconShield } from "@/components/icons"
import { cn } from "@/lib/utils"

/**
 * Shared observable states for the four screens (spec Screen 11-14: loading / empty / error /
 * permission). Error text maps the stable backend error.code to a friendly message; the backend
 * message itself is non-contract and shown only as secondary detail. Permission codes (401/403)
 * render amber with a shield so they read distinctly from red operation rejections.
 */
const ERROR_TEXT: Record<string, string> = {
  MEMBER_REQUIRED: "缺少或未知成员身份，请在上方身份栏粘贴有效的 X-Member-Id。",
  TRIP_NOT_FOUND: "行程不存在，请检查行程 ID。",
  NOT_A_MEMBER: "你不是该行程的成员，无法查看或操作其分队草稿。",
  NOT_SPLIT_INITIATOR: "仅草稿发起人可执行此操作。",
  NOT_SPLIT_ORGANIZER: "仅行程组织者可确认分队。",
  SPLIT_DRAFT_INCOMPLETE: "草稿尚不完整：请补齐边界、路线或分组。",
  SPLIT_TIMING_INFEASIBLE: "路线对不可行：存在超窗或缺失输入，整对无法确认。",
  NONPOSITIVE_SPLIT_WINDOW: "时间窗必须为正：会合时刻需晚于出发时刻。",
  BOUNDARY_NOT_IN_MAIN_PLAN: "边界节点不在已确认主线内，请仅从主线 stop 选择。",
  INVALID_ROUTE_PAIR: "快照非法：需恰好两条分组路线。",
  INVALID_ROUTE_INPUT: "路线输入非法：站点至少 1 个、站名必填、分钟需为非负整数；A 组路段数=站点数，B 组路段数=站点数+1。",
  MAIN_PLAN_NOT_CONFIRMED: "主线尚未全员确认，暂不能发起分队。",
  SPLIT_DRAFT_CONFLICT: "该行程已存在活跃草稿（每次行程仅一次分队）。",
  SPLIT_DRAFT_NOT_ACTIVE: "当前无活跃草稿，请先发起。",
  STALE_DRAFT_VERSION: "草稿版本已过期，请刷新后重试。",
  SPLIT_BOUNDARIES_REQUIRED: "请先保存出发/会合边界，再生成路线。",
  INVALID_GROUP_LABEL: "目标组别无效，只能是 A 或 B。",
  SPLIT_MEMBERS_INSUFFICIENT: "行程至少需要两名成员才能发起与确认分队。",
  ROUTE_GENERATION_FAILED: "路线生成失败，整对已回滚（无半成品路线）。",
  SPLIT_BUDGET_HARD_OVERRUN: "有成员将超出硬性预算：确认被阻止，请调整预算或分队活动。",
  INVALID_ACTIVITIES: "分队活动不合法：活动内容必填，费用需在允许范围内。",
  ENDPOINT_NOT_FOUND: "接口不可用（404）：请确认后端已更新并重启到最新版本。",
}

const PERMISSION_CODES = new Set(["MEMBER_REQUIRED", "NOT_A_MEMBER", "NOT_SPLIT_INITIATOR", "NOT_SPLIT_ORGANIZER"])

/** Friendly text for the machine-readable `error.details.missing` items (US-040 DD15). */
const MISSING_TEXT: Record<string, string> = {
  boundaries: "出发/会合边界未保存",
  routes: "两条路线未生成",
  "routes.A": "A 组路线缺失",
  "routes.B": "B 组路线缺失",
  "groups.A": "A 组没有成员",
  "groups.B": "B 组没有成员",
  "groups.unassigned": "有成员未分组",
  "groups.duplicate": "有成员重复分组",
}

export function LoadingState({ label = "加载中…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-ink-3">
      <span className="relative flex size-3">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
        <span className="relative inline-flex size-3 rounded-full bg-brand" />
      </span>
      <span className="text-xs font-semibold">{label}</span>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-ink-3">
      {icon ? <span className="opacity-50 [&_svg]:size-8">{icon}</span> : null}
      <div className="text-sm font-bold text-ink-2">{title}</div>
      {hint ? <p className="max-w-[280px] text-xs leading-relaxed">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const apiError = error instanceof SplitApiError ? error : null
  const code = apiError?.code ?? "UNKNOWN"
  const permission = PERMISSION_CODES.has(code)
  const text = ERROR_TEXT[code] ?? apiError?.message ?? "发生未知错误。"
  const title = permission ? "无权限 / 身份不足" : "操作被拒绝"
  const ink = permission ? "text-[#b45309]" : "text-[#b91c1c]"

  return (
    <Card className={cn("p-4", permission ? "border-[#fde68a] bg-warn-soft" : "border-[#fecaca] bg-err-soft")}>
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full [&_svg]:size-4",
            permission ? "bg-warn/10 text-warn" : "bg-err/10 text-err",
          )}
        >
          {permission ? <IconShield /> : <IconAlert />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("text-[13px] font-bold", ink)}>{title}</span>
            <Badge variant={permission ? "warn" : "err"}>{code}</Badge>
          </div>
          <p className={cn("mt-1 text-xs leading-relaxed", ink)}>{text}</p>
          {apiError?.details?.routes?.length ? (
            <ul className="mt-1.5 space-y-0.5 text-[11px] leading-relaxed text-ink-2">
              {apiError.details.routes.map((route) => (
                <li key={route.groupLabel}>
                  {route.groupLabel} 组：合计 {route.totalMinutes ?? "—"} 分
                  {route.overrunMinutes ? ` · 超窗 ${route.overrunMinutes} 分` : ""}
                  {route.missingInputs.length > 0 ? ` · 缺 ${route.missingInputs.join("、")}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          {apiError?.details?.missing?.length ? (
            <p className="mt-1 text-[11px] leading-relaxed text-ink-2">
              缺失项：{apiError.details.missing.map((item) => MISSING_TEXT[item] ?? item).join("、")}
            </p>
          ) : null}
          {apiError ? (
            <p className="mt-1 text-[10.5px] text-ink-3">
              HTTP {apiError.status} · {apiError.message}
            </p>
          ) : null}
          {onRetry ? (
            <Button variant="outline" size="sm" className="mt-2.5" onClick={onRetry}>
              重试
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}