import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAssignGroup, useGenerateRoutes, useSplitDraft, useTripMembers } from "./hooks"
import { useAuth } from "../auth/AuthProvider"
import { SplitLayout } from "./split-layout"
import { EmptyState, ErrorState, LoadingState } from "./states"
import { RouteCard } from "./route-card"
import type { TripMember } from "../../types"
import { Button } from "@/components/ui/button"
import { IconArrowRight, IconBranch, IconRoute, IconSparkle, IconUsers } from "@/components/icons"
import { formatClock, shortId } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Screen 13 — group routes (spec US-040 + US-042). The group card lists each group's members as avatar chips by
 * display name (roster from GET /api/trips/{id}/members); clicking a member moves that member into the other group
 * (any trip member may adjust the split, user ruling 2026-11-17 — the prototype's avatar-click interaction). Group
 * changes bump the draft version and never touch the saved route pair, so the stale-route notice stays visible until
 * the initiator regenerates. Generate wires POST routes:generate (paired atomic); incomplete groups are rejected with
 * SPLIT_DRAFT_INCOMPLETE and its groups.* details.
 */
export function ScreenRoutes() {
  const { tripId = "" } = useParams()
  const navigate = useNavigate()
  const draft = useSplitDraft(tripId)
  const generate = useGenerateRoutes(tripId)
  const assign = useAssignGroup(tripId)
  const membersQuery = useTripMembers(tripId)
  const { accountId } = useAuth()
  const [notice, setNotice] = useState<string | null>(null)
  const detail = draft.data
  const myId = accountId == null ? null : String(accountId)
  const tooFewMembers = membersQuery.data != null && membersQuery.data.length < 2

  const stopNames = new Map((detail?.mainPlanStops ?? []).map((stop) => [stop.id, stop.name]))
  const nameOf = (id: string | null) => (id ? (stopNames.get(id) ?? "未知节点") : "—")
  const routes = detail?.routes ?? []
  const hasPair = routes.length === 2
  const boundariesSaved = detail?.windowMinutes != null

  const action = tooFewMembers ? null : (
    <>
      <Button
        variant="outline"
        className="flex-1"
        disabled={!boundariesSaved || generate.isPending}
        onClick={() => detail && generate.mutate({ draftVersion: detail.draftVersion })}
      >
        {generate.isPending ? "生成中…" : hasPair ? "重新生成" : "生成两条路线"} <IconSparkle />
      </Button>
      <Button className="flex-1" disabled={!hasPair} onClick={() => navigate(`/trips/${tripId}/split/timing`)}>
        下一步 <IconArrowRight />
      </Button>
    </>
  )

  return (
    <SplitLayout
      title="分组与路线"
      subtitle="成对生成 · 成员可调整分组"
      step={2}
      backTo={`/trips/${tripId}/split/boundaries`}
      action={action}
    >
      {draft.isPending ? (
        <LoadingState label="加载分组与路线…" />
      ) : draft.error ? (
        <ErrorState error={draft.error} onRetry={() => draft.refetch()} />
      ) : tooFewMembers ? (
        <EmptyState
          icon={<IconUsers />}
          title="无法分队：成员不足"
          hint={`当前行程只有 ${membersQuery.data?.length ?? 0} 名成员。分队需要 A/B 两组各至少一人，至少两名成员才能继续。`}
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                window.location.href = `/#/trips/${tripId}`
              }}
            >
              返回行程详情
            </Button>
          }
        />
      ) : !detail ? (
        <EmptyState
          icon={<IconBranch />}
          title="尚未发起草稿"
          hint="请先发起草稿并保存边界，再生成路线。"
          action={
            <Button size="sm" onClick={() => navigate(`/trips/${tripId}/split`)}>
              去发起
            </Button>
          }
        />
      ) : !boundariesSaved ? (
        <EmptyState
          icon={<IconRoute />}
          title="尚未保存边界"
          hint="生成路线前需先保存出发与会合边界。"
          action={
            <Button size="sm" onClick={() => navigate(`/trips/${tripId}/split/boundaries`)}>
              去选择边界
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <GroupCard
            groups={detail.groups}
            members={membersQuery.data}
            myId={myId}
            assignable={detail.status === "active"}
            hasRoutes={hasPair}
            assigning={assign.isPending}
            notice={notice}
            onAssign={(memberId, label) => {
              setNotice(null)
              assign.mutate(
                { memberId, groupLabel: label, draftVersion: detail.draftVersion },
                { onSuccess: () => setNotice("分组已更新，路线仍为上次生成的版本，可点击重新生成。") },
              )
            }}
          />

          {hasPair ? (
            <div className="flex flex-col gap-3">
              {routes.map((route) => (
                <RouteCard
                  key={route.groupLabel}
                  route={route}
                  tone={route.groupLabel === "B" ? "b" : "a"}
                  departureName={nameOf(route.departureStopId)}
                  reunionName={nameOf(route.reunionStopId)}
                  reunionClock={formatClock(detail.reunionAt)}
                  stale={(detail.groups[route.groupLabel] ?? []).length === 0}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<IconSparkle />}
              title="尚未生成路线"
              hint="点击下方“生成两条路线”，后端将成对原子生成 A/B 路线（失败整对回滚）。"
            />
          )}

          {generate.error ? <ErrorState error={generate.error} /> : null}
          {assign.error ? <ErrorState error={assign.error} /> : null}
        </div>
      )}
    </SplitLayout>
  )
}

/**
 * Group cards (US-040 DD13/DD14 + revision 2026-11-17), styled after the prototype Screen 13 `.route` block:
 * a colored A/B header (code badge + group name + headcount) above a chips body. Clicking a member chip moves that
 * member into the other group (any trip member may adjust the split). The stale-route marker lives on the route
 * cards, never inside an empty group.
 */
function GroupCard({
  groups,
  members,
  myId,
  assignable,
  hasRoutes,
  assigning,
  notice,
  onAssign,
}: {
  groups: Record<string, string[]>
  members: TripMember[] | undefined
  myId: string | null
  assignable: boolean
  hasRoutes: boolean
  assigning: boolean
  notice: string | null
  onAssign: (memberId: string, label: "A" | "B") => void
}) {
  const nameOf = (id: string) =>
    members?.find((member) => String(member.userId) === id)?.displayName ?? shortId(id)
  const initialOf = (id: string) => nameOf(id).slice(0, 1).toUpperCase()
  const hasEmptyGroup = Object.values(groups).some((ids) => ids.length === 0)

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-ink">
        <IconUsers className="text-brand" /> 分组
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {Object.entries(groups).map(([label, ids]) => {
          const isA = label === "A"
          const head = isA ? "from-a to-[#1e40af]" : label === "B" ? "from-b to-[#9a3412]" : "from-ink-3 to-ink-3"
          const border = isA ? "border-a-line" : label === "B" ? "border-b-line" : "border-line"
          const chipOn = isA ? "border-a bg-a" : label === "B" ? "border-b bg-b" : "border-ink bg-ink"
          const target: "A" | "B" = label === "B" ? "A" : "B"
          return (
            <div
              key={label}
              className={cn(
                "overflow-hidden rounded-card border bg-surface shadow-[0_1px_3px_rgba(28,25,23,0.06)]",
                border,
              )}
            >
              <div className={cn("flex items-center gap-2 bg-gradient-to-br px-3 py-2.5 text-white", head)}>
                <span className="grid size-6 shrink-0 place-items-center rounded-[7px] bg-white/25 text-[12px] font-extrabold">
                  {label}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{label} 组</span>
                <span className="shrink-0 text-[11px] font-medium text-white/85">{ids.length} 人</span>
              </div>
              <div className="flex min-h-[58px] flex-wrap content-start gap-2 p-3">
                {ids.length === 0 ? (
                  <span className="text-[11.5px] leading-relaxed text-ink-3">暂无成员</span>
                ) : (
                  ids.map((id) => {
                    const isMe = id === myId
                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={!assignable || assigning}
                        onClick={() => onAssign(id, target)}
                        title={assignable ? `点击移到 ${target} 组` : undefined}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-semibold text-white transition",
                          chipOn,
                          assignable && "hover:brightness-105 active:scale-[0.98]",
                          !assignable && "cursor-default opacity-90",
                        )}
                      >
                        <span className="grid size-[18px] shrink-0 place-items-center rounded-full bg-white/25 text-[10px] font-bold">
                          {initialOf(id)}
                        </span>
                        <span className="max-w-[64px] truncate">{nameOf(id)}</span>
                        {isMe ? <span className="text-[9.5px] font-bold text-white/85">我</span> : null}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
      {assignable ? (
        <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
          点击成员头像可把他移到另一组；所有行程成员都可以调整分组。
        </p>
      ) : null}
      {hasEmptyGroup ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">两组都有成员后才能生成路线与确认。</p>
      ) : null}
      {notice ? <p className="mt-1.5 text-[11px] font-semibold text-ok">{notice}</p> : null}
      {hasRoutes ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">
          路线为上次生成的版本，可点击「重新生成」按当前分组重做。
        </p>
      ) : null}
    </div>
  )
}