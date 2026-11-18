import { useState } from "react"
import { SplitApiError } from "./api"
import { useRecommendActivities, useSaveActivities } from "./hooks"
import type { GroupRoute, RouteActivity, SplitDraftDetail } from "./types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IconAlert, IconRoute, IconSparkle, IconX } from "@/components/icons"
import { formatCost } from "@/lib/format"
import { cn } from "@/lib/utils"

const SOURCE_LABEL: Record<string, string> = {
  main: "沿主线",
  ai: "AI 推荐",
  manual: "手动",
}

function errorLabel(error: unknown): string | null {
  if (!error) return null
  if (error instanceof SplitApiError) {
    if (error.code === "STALE_DRAFT_VERSION") return "草稿版本已过期，请刷新后重试。"
    if (error.code === "NOT_SPLIT_INITIATOR") return "只有草稿发起人可以修改分队活动。"
    return error.message
  }
  return error instanceof Error ? error.message : String(error)
}

/**
 * Screen 13 costed-activity editor (US-045). Lists what the group pays for during the split window, offers the
 * mock-AI recommendation that fits the group's remaining budget, and accepts manual rows (content/location/cost).
 * Every write replaces the whole group list through PUT .../split-draft/activities with the current draft version,
 * so a concurrent edit is a visible 409 rather than a lost update. Only the initiator may edit an active draft;
 * everyone else sees the same numbers read-only. Editing cost never changes timing: the route pair already fits.
 */
export function ActivityEditor({
  tripId,
  detail,
  route,
  canEdit,
  destination,
}: {
  tripId: string
  detail: SplitDraftDetail
  route: GroupRoute
  canEdit: boolean
  destination: string | null
}) {
  const save = useSaveActivities(tripId)
  const recommend = useRecommendActivities(tripId)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
  const [location, setLocation] = useState("")
  const [cost, setCost] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<RouteActivity[] | null>(null)

  const groupLabel = route.groupLabel === "B" ? "B" : "A"
  const activities = route.activities ?? []
  const totalCents = activities.reduce((sum, item) => sum + item.costCents, 0)
  const busy = save.isPending || recommend.isPending
  const error = errorLabel(save.error ?? recommend.error)

  const persist = (next: RouteActivity[]) => {
    save.mutate({
      groupLabel,
      draftVersion: detail.draftVersion,
      activities: next.map((item) => ({
        name: item.name,
        location: item.location,
        costCents: item.costCents,
        source: item.source,
      })),
    })
  }

  const addActivity = () => {
    const trimmed = name.trim()
    const costValue = Number(cost)
    if (!trimmed) {
      setFormError("请填写活动内容。")
      return
    }
    if (!Number.isFinite(costValue) || costValue < 0) {
      setFormError("费用必须是不小于 0 的数字。")
      return
    }
    setFormError(null)
    persist([
      ...activities,
      {
        name: trimmed,
        location: location.trim() || null,
        costCents: Math.round(costValue * 100),
        source: "manual",
      },
    ])
    setName("")
    setLocation("")
    setCost("")
    setAdding(false)
  }

  const askAi = () => {
    setSuggestion(null)
    recommend.mutate(
      { groupLabel, draftVersion: detail.draftVersion },
      { onSuccess: (result) => setSuggestion(result) },
    )
  }

  return (
    <Card className="p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
          <IconRoute className={cn("size-3.5", groupLabel === "B" ? "text-b" : "text-a")} />
          {groupLabel} 组活动与费用
        </span>
        <Badge variant={totalCents > 0 ? "brand" : "ok"}>{formatCost(totalCents, destination)} / 人</Badge>
      </div>

      {activities.length === 0 ? (
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
          暂无分队活动：分队期间不产生额外费用，只合计仍适用的共享费用。
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {activities.map((item, index) => (
            <li key={`${groupLabel}-${index}-${item.name}`} className="flex items-center gap-2 text-[12px]">
              <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                {item.name}
                {item.location ? <span className="ml-1 text-[11px] font-normal text-ink-3">· {item.location}</span> : null}
              </span>
              <span className="shrink-0 rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold text-ink-2">
                {SOURCE_LABEL[item.source] ?? item.source}
              </span>
              <span className="w-16 shrink-0 text-right font-bold text-ink">
                {formatCost(item.costCents, destination)}
              </span>
              {canEdit ? (
                <button
                  type="button"
                  aria-label={`删除 ${item.name}`}
                  disabled={busy}
                  className="grid size-5 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-err-soft hover:text-err disabled:opacity-40 [&_svg]:size-3"
                  onClick={() => persist(activities.filter((_, position) => position !== index))}
                >
                  <IconX />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {suggestion ? (
        <div className="mt-2.5 rounded-sm border border-[#99f6e4] bg-brand-soft/50 p-2.5">
          {suggestion.length === 0 ? (
            <p className="text-[11.5px] leading-relaxed text-ink-2">
              当前剩余预算下没有可推荐的活动：可以提高预算或手动填写更便宜的活动。
            </p>
          ) : (
            <>
              <p className="text-[11.5px] font-semibold text-brand-ink">AI 推荐（预算范围内）</p>
              <ul className="mt-1 flex flex-col gap-1">
                {suggestion.map((item, index) => (
                  <li key={`suggestion-${index}`} className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="min-w-0 truncate text-ink">
                      {item.name}
                      {item.location ? <span className="ml-1 text-[11px] text-ink-3">· {item.location}</span> : null}
                    </span>
                    <span className="shrink-0 font-bold text-ink">{formatCost(item.costCents, destination)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    persist(suggestion)
                    setSuggestion(null)
                  }}
                >
                  采纳推荐
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setSuggestion(null)}>
                  忽略
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {adding && canEdit ? (
        <div className="mt-2.5 flex flex-col gap-2 rounded-sm border border-line-2 bg-surface-2 p-2.5">
          <div className="field">
            <label className="label" htmlFor={`activity-name-${groupLabel}`}>
              活动内容
            </label>
            <input
              id={`activity-name-${groupLabel}`}
              className="input"
              value={name}
              maxLength={60}
              placeholder="例如：老城咖啡"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor={`activity-location-${groupLabel}`}>
              地点 <span className="text-ink-3">（可选）</span>
            </label>
            <input
              id={`activity-location-${groupLabel}`}
              className="input"
              value={location}
              maxLength={60}
              placeholder="例如：大学路"
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor={`activity-cost-${groupLabel}`}>
              人均费用
            </label>
            <input
              id={`activity-cost-${groupLabel}`}
              className="input"
              inputMode="decimal"
              type="number"
              min={0}
              step="0.01"
              value={cost}
              placeholder="0"
              onChange={(event) => setCost(event.target.value)}
            />
          </div>
          {formError ? <p className="text-[11px] font-semibold text-err">{formError}</p> : null}
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={addActivity}>
              保存活动
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setAdding(false)
                setFormError(null)
              }}
            >
              取消
            </Button>
          </div>
        </div>
      ) : null}

      {canEdit ? (
        <div className="mt-2.5 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" disabled={busy} onClick={askAi}>
            {recommend.isPending ? "推荐中…" : "AI 推荐活动"} <IconSparkle />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={busy}
            onClick={() => {
              setAdding((open) => !open)
              setFormError(null)
            }}
          >
            手动添加活动
          </Button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 flex items-start gap-1 text-[11px] leading-relaxed font-semibold text-err">
          <IconAlert className="mt-0.5 size-3" /> {error}
        </p>
      ) : null}
    </Card>
  )
}
