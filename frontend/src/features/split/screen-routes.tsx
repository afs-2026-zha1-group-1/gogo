import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAssignGroup, useGenerateRoutes, useSplitDraft, useTripMembers } from "./hooks"
import { useAuth } from "../auth/AuthProvider"
import { SplitLayout } from "./split-layout"
import { EmptyState, ErrorState, LoadingState } from "./states"
import { RouteCard } from "./route-card"
import type { TripMember } from "../../types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconArrowRight, IconBranch, IconRoute, IconSparkle, IconUsers } from "@/components/icons"
import { formatClock, shortId } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Screen 13 — group routes (spec US-040 + US-042). The group card lists each group's members by display name
 * (roster from GET /api/trips/{id}/members), marks the caller's group and lets the caller move only themselves;
 * group changes bump the draft version and never touch the saved route pair, so the stale-route notice stays visible
 * until the initiator regenerates. Generate wires POST routes:generate (paired atomic); incomplete groups are
 * rejected with SPLIT_DRAFT_INCOMPLETE and its groups.* details.
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

  const stopNames = new Map((detail?.mainPlanStops ?? []).map((stop) => [stop.id, stop.name]))
  const nameOf = (id: string | null) => (id ? (stopNames.get(id) ?? "未知节点") : "—")
  const routes = detail?.routes ?? []
  const hasPair = routes.length === 2
  const boundariesSaved = detail?.windowMinutes != null

  const action = (
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
      subtitle="成对生成 · 成员可自选小组"
      step={2}
      backTo={`/trips/${tripId}/split/boundaries`}
      action={action}
    >
      {draft.isPending ? (
        <LoadingState label="加载分组与路线…" />
      ) : draft.error ? (
        <ErrorState error={draft.error} onRetry={() => draft.refetch()} />
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
            onAssign={(label) => {
              setNotice(null)
              assign.mutate(
                { groupLabel: label, draftVersion: detail.draftVersion },
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
 * Group card (US-040 DD13/DD14): members by display name, the caller's marker and a self-only move button.
 * An emptied group that still has saved routes is flagged "需重新生成"; any saved pair carries the stale-route
 * notice because the document does not record which group version produced the routes.
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
  onAssign: (label: "A" | "B") => void
}) {
  const nameOf = (id: string) =>
    members?.find((member) => String(member.userId) === id)?.displayName ?? shortId(id)
  const myGroup =
    myId == null
      ? null
      : (Object.entries(groups).find(([, ids]) => ids.includes(myId))?.[0] ?? null)
  const hasEmptyGroup = Object.values(groups).some((ids) => ids.length === 0)

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-ink">
        <IconUsers className="text-brand" /> 分组
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {Object.entries(groups).map(([label, ids]) => {
          const box =
            label === "A" ? "border-a-line bg-a-soft" : label === "B" ? "border-b-line bg-b-soft" : "border-line bg-surface-3"
          const ink = label === "A" ? "text-a" : label === "B" ? "text-b" : "text-ink"
          const isMine = myGroup === label
          return (
            <div key={label} className={cn("rounded-card border p-3", box)}>
              <div className={cn("flex items-center justify-between gap-1 text-[13px] font-extrabold", ink)}>
                <span>
                  {label} 组
                  {isMine ? <span className="ml-1 text-[10px] font-bold text-ink-2">（我）</span> : null}
                </span>
                <span className="text-[11px] font-semibold text-ink-2">{ids.length} 人</span>
              </div>
              <ul className="mt-1.5 space-y-0.5 text-[11.5px] text-ink-2">
                {ids.length === 0 ? (
                  <li className="text-ink-3">暂无成员</li>
                ) : (
                  ids.map((id) => (
                    <li key={id} className={cn(id === myId && "font-bold text-ink")}>
                      {nameOf(id)}
                    </li>
                  ))
                )}
              </ul>
              {assignable ? (
                <Button
                  variant={isMine ? "outline" : "primary"}
                  size="sm"
                  className="mt-2 w-full"
                  disabled={isMine || assigning}
                  onClick={() => onAssign(label === "B" ? "B" : "A")}
                >
                  {isMine ? "我在本组" : `加入 ${label} 组`}
                </Button>
              ) : null}
              {hasRoutes && ids.length === 0 ? (
                <div className="mt-1.5 text-[10.5px] font-semibold text-warn">需重新生成</div>
              ) : null}
            </div>
          )
        })}
      </div>
      {hasEmptyGroup ? (
        <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
          至少一名成员加入另一组后才能生成路线与确认；只能由成员本人切换自己的小组。
        </p>
      ) : null}
      {notice ? <p className="mt-1.5 text-[11px] font-semibold text-ok">{notice}</p> : null}
      {hasRoutes ? (
        <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
          路线为上次生成的版本，可点击「重新生成」按当前分组重做。
        </p>
      ) : null}
    </Card>
  )
}