import { useParams } from "react-router-dom"
import { useSplitNavigate } from "./split-navigation"
import { useCancelDraft, useConfirmDraft, useSplitDraft } from "./hooks"
import { useAuth } from "../auth/AuthProvider"
import { SplitLayout } from "./split-layout"
import { EmptyState, ErrorState, LoadingState } from "./states"
import type { GroupRoute, SplitDraftStatus } from "./types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ValidItem, ValidList } from "@/components/ui/valid-item"
import { IconAlert, IconBranch, IconCheck, IconClock, IconFlag, IconNav, IconRoute, IconSparkle } from "@/components/icons"
import { formatClock, shortId } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Screen 15 — split review, confirmation and cancellation (spec US-049 / US-050). The page renders the saved
 * route pair, groups, boundaries and status; the organizer confirms the current version (server recomputes timing
 * and may reject with SPLIT_TIMING_INFEASIBLE / SPLIT_DRAFT_INCOMPLETE), the initiator cancels an unconfirmed
 * draft (the row becomes replaceable). The client renders only backend verdicts: it never declares feasibility,
 * eligibility or success. Error details (per-route totals/missing inputs) come from error.details.
 */
export function ScreenConfirm() {
  const { tripId = "" } = useParams()
  const navigate = useSplitNavigate()
  const draft = useSplitDraft(tripId)
  const confirm = useConfirmDraft(tripId)
  const cancel = useCancelDraft(tripId)
  const { accountId } = useAuth()
  const detail = draft.data
  const status: SplitDraftStatus | undefined = detail?.status
  const isInitiator = detail != null && accountId != null && detail.initiatorMemberId === accountId
  const busy = confirm.isPending || cancel.isPending

  const onCancel = () => {
    if (!detail) return
    if (!window.confirm("确认取消该拆分草稿？主线方案不会改变，取消后可重新发起。")) return
    cancel.mutate(detail.draftVersion)
  }

  const action =
    status === "active" ? (
      <>
        {isInitiator ? (
          <Button variant="outline" className="flex-1" disabled={busy} onClick={onCancel}>
            {cancel.isPending ? "取消中…" : "取消草稿"}
          </Button>
        ) : null}
        <Button
          className="flex-1"
          disabled={busy}
          onClick={() => detail && confirm.mutate(detail.draftVersion)}
        >
          {confirm.isPending ? "确认中…" : "确认分队"} <IconCheck />
        </Button>
      </>
    ) : (
      <Button className="flex-1" onClick={() => navigate(`/trips/${tripId}/split`)}>
        返回分队首页
      </Button>
    )

  return (
    <SplitLayout
      title="复核并确认分队"
      subtitle="服务端重校验通过后成对生效"
      step={4}
      backTo={`/trips/${tripId}/split/timing`}
      right={
        <Badge variant={status === "confirmed" ? "ok" : status === "cancelled" ? "warn" : "brand"}>
          {status === "confirmed" ? "已确认" : status === "cancelled" ? "已取消" : "待确认"}
        </Badge>
      }
      action={action}
    >
      {draft.isPending ? (
        <LoadingState label="加载草稿复核信息…" />
      ) : draft.error ? (
        <ErrorState error={draft.error} onRetry={() => draft.refetch()} />
      ) : !detail ? (
        <EmptyState
          icon={<IconBranch />}
          title="尚未发起草稿"
          hint="请先发起草稿、保存边界并生成两条路线。"
          action={<Button size="sm" onClick={() => navigate(`/trips/${tripId}/split`)}>去发起</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <Card className="p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[13px] font-bold text-ink">
                时间窗 {formatClock(detail.departureAt)} → {formatClock(detail.reunionAt)}
              </div>
              <Badge variant="brand">
                <IconClock /> {detail.windowMinutes != null ? `共 ${detail.windowMinutes} 分钟` : "窗口未知"}
              </Badge>
            </div>
            <dl className="mt-2 flex flex-col gap-1 text-[12px]">
              <Row label="发起人" value={shortId(detail.initiatorMemberId)} />
              <Row label="草稿版本" value={`v${detail.draftVersion}`} />
              <Row label="状态" value={detail.status} />
              <Row label="A 组" value={(detail.groups.A ?? []).join(" / ")} />
              <Row label="B 组" value={(detail.groups.B ?? []).join(" / ")} />
            </dl>
          </Card>

          {detail.routes.length === 0 ? (
            <EmptyState
              icon={<IconRoute />}
              title="尚无路线对"
              hint="确认前需先保存边界并生成两条路线。"
              action={<Button size="sm" onClick={() => navigate(`/trips/${tripId}/split/routes`)}>去生成路线</Button>}
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {detail.routes.map((route) => (
                <RouteReview key={route.groupLabel} route={route} windowMinutes={detail.windowMinutes} />
              ))}
            </div>
          )}

          {status === "confirmed" ? (
            <Card className="flex items-start gap-2.5 border-[#a7f3d0] bg-ok-soft p-3.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ok/15 text-ok [&_svg]:size-4">
                <IconCheck />
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-[#047857]">拆分已确认</div>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-2">
                  两条路线、分组与边界已作为唯一方案成对生效，草稿不可再编辑或取消。
                </p>
              </div>
            </Card>
          ) : null}

          {status === "cancelled" ? (
            <Card className="flex items-start gap-2.5 border-[#fde68a] bg-warn-soft p-3.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-warn/15 text-warn [&_svg]:size-4">
                <IconAlert />
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-[#b45309]">草稿已取消</div>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-2">
                  主线方案未改变；可在分队首页发起替换草稿。
                </p>
              </div>
            </Card>
          ) : null}

          {confirm.error ? <ErrorState error={confirm.error} /> : null}
          {cancel.error ? <ErrorState error={cancel.error} /> : null}

          <p className="text-[10.5px] leading-relaxed text-ink-3">
            确认由服务端从草稿复算时间窗，客户端声明不参与判定；失败时下方明细来自 error.details。
          </p>
        </div>
      )}
    </SplitLayout>
  )
}

function RouteReview({ route, windowMinutes }: { route: GroupRoute; windowMinutes: number | null }) {
  const tone = route.groupLabel === "B" ? "b" : "a"
  const legs = route.travelLegsMinutes ?? []
  const legsKnown = legs.every((leg) => leg != null)
  const legsSum = legsKnown ? legs.reduce((sum, leg) => sum + (leg ?? 0), 0) : null
  const complete =
    route.activityMinutes != null && legsSum != null && route.bufferMinutes != null
  const total = complete ? (route.activityMinutes ?? 0) + (legsSum ?? 0) + (route.bufferMinutes ?? 0) : null
  const overrun = total != null && windowMinutes != null ? Math.max(0, total - windowMinutes) : null

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={cn("text-[13px] font-extrabold", tone === "a" ? "text-a" : "text-b")}>
          {route.groupLabel} 组 · {route.activityName ?? "活动未生成"}
        </span>
        {!complete ? (
          <Badge variant="warn">
            <IconAlert /> 缺输入
          </Badge>
        ) : overrun != null && overrun > 0 ? (
          <Badge variant="err">
            <IconAlert /> 超窗 {overrun} 分
          </Badge>
        ) : (
          <Badge variant="ok">
            <IconCheck /> {total} ≤ {windowMinutes ?? "—"}
          </Badge>
        )}
      </div>
      <ValidList>
        <ValidItem tone={tone} icon={<IconSparkle />} title="活动" trailing={route.activityMinutes != null ? `${route.activityMinutes} 分` : "缺失"} />
        <ValidItem
          tone={tone}
          icon={<IconNav />}
          title={`路程（${legs.map((leg) => leg ?? "?").join(" + ") || "—"}）`}
          trailing={legsSum != null ? `${legsSum} 分` : "缺失"}
        />
        <ValidItem tone={tone} icon={<IconClock />} title="缓冲" trailing={route.bufferMinutes != null ? `${route.bufferMinutes} 分` : "缺失"} />
        <ValidItem tone={tone} icon={<IconFlag />} title="合计" trailing={total != null ? `${total} 分` : "—"} />
      </ValidList>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-ink-3">{label}</dt>
      <dd className="truncate font-mono font-semibold text-ink">{value}</dd>
    </div>
  )
}
