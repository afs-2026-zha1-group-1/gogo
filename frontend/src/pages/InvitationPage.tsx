import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api'
import Icon from '../Icons'
import InvitationPanel from './InvitationPanel'
import type { Trip } from '../types'
import { useAuth } from '../features/auth/AuthProvider'

interface InvitationPageProps {
  tripId: number
}

type PageState =
  | { kind: 'loading' }
  | { kind: 'ready'; trip: Trip }
  | { kind: 'denied'; message?: string }
  | { kind: 'missing'; message?: string }
  | { kind: 'failed'; message: string | undefined }

// US-083 R4: dedicated full-screen invitation page (no bottom dock, app-shell
// delta). Reuses the InvitationPanel issuance contract; the organizer sees QR +
// link + copy with a 生效中 pill, a non-organizer sees the permission state
// without any link/token/QR payload. Prototype extras (WeChat share, expiry,
// revoke) are deviation D-1 and intentionally absent.
export default function InvitationPage({ tripId }: InvitationPageProps) {
  const { account } = useAuth()
  const [state, setState] = useState<PageState>({ kind: 'loading' })
  const [invitationReady, setInvitationReady] = useState(false)

  useEffect(() => {
    let active = true
    setState({ kind: 'loading' })
    api<Trip>(`/api/trips/${tripId}`)
      .then((result) => {
        if (!active) return
        if (result.ok && result.data) {
          setState({ kind: 'ready', trip: result.data })
        } else if (!result.ok && result.status === 403) {
          setState({ kind: 'denied', message: result.data?.message })
        } else if (!result.ok && result.status === 404) {
          setState({ kind: 'missing', message: result.data?.message })
        } else {
          const message = result.ok ? undefined : result.data?.message
          setState({ kind: 'failed', message: message ?? `HTTP ${result.status}` })
        }
      })
      .catch((cause: unknown) => {
        if (active) setState({ kind: 'failed', message: errorMessage(cause) })
      })
    return () => {
      active = false
    }
  }, [tripId])

  const appbar = (
    <header className="appbar">
      <a className="iconbtn" href={`#/trips/${tripId}`} aria-label="Back"><Icon name="left" /></a>
      <div className="grow">
        <div className="title">邀请朋友</div>
        <div className="sub">US-008 · 分享邀请链接</div>
      </div>
      {invitationReady && <span className="pill ok"><span className="dot" /> 生效中</span>}
    </header>
  )

  if (state.kind === 'loading') {
    return (
      <div className="screen">
        {appbar}
        <div className="body"><div className="loading">正在加载行程…</div></div>
      </div>
    )
  }

  if (state.kind !== 'ready') {
    const heading =
      state.kind === 'denied' ? '没有访问权限'
        : state.kind === 'missing' ? '行程不存在'
          : '无法加载行程'
    const explanation =
      state.kind === 'denied' ? '你不是这个行程的成员，无法分享邀请。'
        : state.kind === 'missing' ? '没有这个行程，或链接中的编号不正确。'
          : state.message
    return (
      <div className="screen">
        {appbar}
        <div className="body">
          <section className="card pad">
            <div className="success-hero" style={{ paddingTop: 10 }}>
              <div className="checkring err"><Icon name="alert" className="lg" /></div>
              <h2>{heading}</h2>
              <p className="hint">{explanation}</p>
            </div>
            <a className="btn btn-ghost" href={`#/trips/${tripId}`}>返回行程详情</a>
          </section>
        </div>
      </div>
    )
  }

  const isOrganizer = state.trip.organizerId === account?.id

  return (
    <div className="screen">
      {appbar}
      <div className="body">
        <InvitationPanel
          tripId={tripId}
          isOrganizer={isOrganizer}
          showTitle={false}
          onReadyChange={setInvitationReady}
        />
      </div>
    </div>
  )
}