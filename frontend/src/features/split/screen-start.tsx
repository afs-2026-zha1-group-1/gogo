import { useNavigate, useParams } from "react-router-dom"
import { useSplitDraft, useStartDraft } from "./hooks"
import { SplitLayout } from "./split-layout"
import { ErrorState, LoadingState } from "./states"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ValidItem, ValidList } from "@/components/ui/valid-item"
import { IconArrowRight, IconBranch, IconCheck, IconClock, IconInfo } from "@/components/icons"
import { shortId } from "@/lib/format"

/**
 * Screen 11 — split start (spec REQ-004 / US-038, US-050 replacement). Empty state (GET data=null) shows the
 * fork-join intro and a start button wired to POST start; an existing draft shows the saved status. The action
 * branches on status: no draft or `cancelled` starts (or replaces) the draft, `active` continues to boundaries,
 * `confirmed` opens the confirmed review on Screen 15 (read-only terminal state, no start entry). Rejections
 * surface from the backend — the client never judges uniqueness, confirmation or cancellation eligibility.
 */
export function ScreenStart() {
  const { tripId = "" } = useParams()
  const navigate = useNavigate()
  const draft = useSplitDraft(tripId)
  const start = useStartDraft(tripId)
  const detail = draft.data

  const status = detail?.status
  const action = status === "active" ? (
    <Button className="flex-1" onClick={() => navigate(`/trips/${tripId}/split/boundaries`)}>
      下一步：选择边界 <IconArrowRight />
    </Button>
  ) : status === "confirmed" ? (
    <Button className="flex-1" onClick={() => navigate(`/trips/${tripId}/split/confirm`)}>
      查看已确认分队 <IconArrowRight />
    </Button>
  ) : (
    <Button className="flex-1" disabled={start.isPending} onClick={() => start.mutate()}>
      {start.isPending ? "发起中…" : status === "cancelled" ? "发起（替换）分队草稿" : "发起分队草稿"}{" "}
      <IconArrowRight />
    </Button>
  )

  return (
    <SplitLayout
      title="智能分队"
      subtitle="US-038 · 本次行程仅一次分队"
      backTo={`/#/trips/${tripId}`}
      right={
        <Badge variant="brand">
          <IconBranch /> Fork
        </Badge>
      }
      action={action}
    >
      {draft.isPending ? (
        <LoadingState label="加载草稿状态…" />
      ) : draft.error ? (
        <ErrorState error={draft.error} onRetry={() => draft.refetch()} />
      ) : (
        <div className="flex flex-col gap-3">
          <Card className="flex items-start gap-2.5 border-brand-soft bg-brand-soft/40 p-3.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink [&_svg]:size-4">
              <IconInfo />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-brand-ink">发起前提：主线方案需全员确认</div>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-2">
                是否满足前提由后端校验；未确认时发起将被拒绝（MAIN_PLAN_NOT_CONFIRMED）。
              </p>
            </div>
          </Card>

          <Card className="p-4">
            <ForkJoin />
            <div className="mt-2 text-center text-[13px] font-bold text-ink">谈不拢？分头玩，到点会合</div>
            <p className="mt-1 text-center text-[11.5px] leading-relaxed text-ink-3">
              从主线某节点分头行动，A/B 两组各自游玩，在会合节点按时集合。
            </p>
          </Card>

          {detail ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconCheck className="text-ok" />{" "}
                  {detail.status === "confirmed" ? "拆分已确认" : detail.status === "cancelled" ? "草稿已取消" : "草稿已发起"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <dl className="flex flex-col gap-1.5 text-[12.5px]">
                  <StatusRow label="发起人" value={shortId(detail.initiatorMemberId)} />
                  <StatusRow label="主线版本" value={`v${detail.mainPlanVersion}`} />
                  <StatusRow label="草稿版本" value={`v${detail.draftVersion}`} />
                  <StatusRow label="状态" value={detail.status} />
                </dl>
                {detail.status === "cancelled" ? (
                  <p className="mt-2 text-[11.5px] leading-relaxed text-ink-2">
                    该提案已放弃，主线未改变；可直接发起替换草稿，重新选择边界与路线。
                  </p>
                ) : null}
                {detail.status === "confirmed" ? (
                  <p className="mt-2 text-[11.5px] leading-relaxed text-ink-2">
                    当前拆分已确认并锁定，不可再编辑或取消；可点下方「查看已确认分队」查看路线与分组。
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card className="px-4 py-1">
            <ValidList>
              <ValidItem
                tone="neutral"
                icon={<IconBranch />}
                title="仅一次分队"
                description="每次行程仅允许一个活跃草稿，重复发起将被拒绝。"
              />
              <ValidItem
                tone="neutral"
                icon={<IconClock />}
                title="出发前或行程中均可"
                description="主线全员确认后即可发起分队草稿。"
              />
            </ValidList>
          </Card>

          {start.error ? <ErrorState error={start.error} /> : null}
        </div>
      )}
    </SplitLayout>
  )
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-ink-3">{label}</dt>
      <dd className="font-mono font-semibold text-ink">{value}</dd>
    </div>
  )
}

/** Fork-join illustration (ui-design-reference Screen 11): teal main line splits into A/B and rejoins. */
function ForkJoin() {
  return (
    <svg viewBox="0 0 320 96" className="h-24 w-full" fill="none" strokeLinecap="round">
      <path d="M12 48 H78" stroke="#0d9488" strokeWidth="3" />
      <path d="M78 48 C110 48 110 22 142 22 H188 C220 22 220 48 252 48" stroke="#2563eb" strokeWidth="3" />
      <path d="M78 48 C110 48 110 74 142 74 H188 C220 74 220 48 252 48" stroke="#ea580c" strokeWidth="3" />
      <path d="M252 48 H300" stroke="#059669" strokeWidth="3" />
      <circle cx="165" cy="22" r="11" fill="#2563eb" />
      <text x="165" y="26" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">A</text>
      <circle cx="165" cy="74" r="11" fill="#ea580c" />
      <text x="165" y="78" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">B</text>
      <text x="42" y="40" textAnchor="middle" fontSize="9" fill="#57534e">主线</text>
      <text x="276" y="40" textAnchor="middle" fontSize="9" fill="#57534e">会合</text>
    </svg>
  )
}