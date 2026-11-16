import { createContext, useContext, useEffect, useState, type KeyboardEvent, type ReactNode } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { cn } from "@/lib/utils"
import { shortId } from "@/lib/format"
import { IconUsers } from "@/components/icons"

/**
 * MVP member identity (design D15 / spec chain convention, DR-05 given-value trust). There is no
 * auth or members endpoint in this change's scope, so the caller supplies X-Member-Id directly.
 * The id is persisted in localStorage and shared by all four screens; no fixture UUID is hardcoded
 * here. The identity bar also lets the caller switch trip id, which makes the permission states
 * (outsider 403 / non-initiator 403 / missing identity 401) observable during the local walkthrough.
 */
const STORAGE_KEY = "gogo.split.memberId"

interface IdentityValue {
  memberId: string
  setMemberId: (id: string) => void
}

const IdentityContext = createContext<IdentityValue | null>(null)

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [memberId, setMemberIdState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? ""
    } catch {
      return ""
    }
  })

  const setMemberId = (id: string) => {
    setMemberIdState(id)
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      /* storage unavailable (private mode) — keep in-memory identity */
    }
  }

  return <IdentityContext.Provider value={{ memberId, setMemberId }}>{children}</IdentityContext.Provider>
}

export function useIdentity(): IdentityValue {
  const ctx = useContext(IdentityContext)
  if (!ctx) throw new Error("useIdentity must be used within IdentityProvider")
  return ctx
}

const inputClass =
  "min-w-0 flex-1 rounded-control border border-line bg-surface px-2 py-1 font-mono text-[11px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"

/** Slim identity bar rendered by the split layout: editable trip id + member id, committed on blur/Enter. */
export function IdentityBar({ className }: { className?: string }) {
  const { tripId = "" } = useParams()
  const navigate = useNavigate()
  const { memberId, setMemberId } = useIdentity()
  const [tripDraft, setTripDraft] = useState(tripId)
  const [memberDraft, setMemberDraft] = useState(memberId)

  useEffect(() => setTripDraft(tripId), [tripId])
  useEffect(() => setMemberDraft(memberId), [memberId])

  const commitTrip = () => {
    const next = tripDraft.trim()
    if (next && next !== tripId) navigate(`/trips/${next}/split`)
  }
  const commitMember = () => setMemberId(memberDraft.trim())
  const onEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") event.currentTarget.blur()
  }

  return (
    <div className={cn("border-b border-line-2 bg-surface/70 px-4 py-2.5", className)}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold tracking-wide text-ink-3 uppercase">
        <IconUsers className="size-3.5" /> 身份 · MVP 按给定值信任（DR-05）
      </div>
      <div className="mt-1.5 flex flex-col gap-1.5">
        <label className="flex items-center gap-2">
          <span className="w-10 shrink-0 text-[11px] font-semibold text-ink-2">行程</span>
          <input
            value={tripDraft}
            onChange={(event) => setTripDraft(event.target.value)}
            onBlur={commitTrip}
            onKeyDown={onEnter}
            placeholder="trip id"
            spellCheck={false}
            className={inputClass}
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="w-10 shrink-0 text-[11px] font-semibold text-ink-2">成员</span>
          <input
            value={memberDraft}
            onChange={(event) => setMemberDraft(event.target.value)}
            onBlur={commitMember}
            onKeyDown={onEnter}
            placeholder="X-Member-Id (trip_member.id)"
            spellCheck={false}
            className={inputClass}
          />
        </label>
      </div>
      <div className="mt-1 text-[10.5px] text-ink-3">
        当前成员：{shortId(memberId)} · 粘贴夹具成员 id 驱动各屏（含无权限态）
      </div>
    </div>
  )
}