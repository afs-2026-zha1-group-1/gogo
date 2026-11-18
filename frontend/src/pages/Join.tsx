import { useEffect, useState, type ReactNode } from 'react'
import { api, errorMessage } from '../api'
import Icon from '../Icons'
import { persistCurrentTrip } from '../lib/current-trip'
import { queueNotice } from '../lib/notice'
import type { AcceptResult, InvitationPreview } from '../types'
import { useAuth } from '../features/auth/AuthProvider'

interface JoinProps {
  token: string
}

type JoinState =
  | { kind: 'loading' }
  | { kind: 'unusable' }
  | { kind: 'failed'; message: string | undefined }
  | { kind: 'ready'; preview: InvitationPreview }
  | { kind: 'closed'; preview: InvitationPreview }
  | { kind: 'joined'; preview: InvitationPreview; alreadyMember: boolean; tripId: number }

function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="screen">
      <header className="appbar">
        <div className="logo"><Icon name="branch" /></div>
        <div className="grow">
          <div className="title">你被邀请加入行程</div>
          <div className="sub">US-010 · 接受邀请前仅显示公开信息</div>
        </div>
      </header>
      <div className="body">{children}</div>
    </div>
  )
}

// User ruling 2026-11-17: an existing member opening the invite (scan or link)
// lands directly on this notice — no preview/accept step, no duplicate join.
function AlreadyMemberNotice({ tripName, tripId, isOrganizer = false }: { tripName: string; tripId: number; isOrganizer?: boolean }) {
  return (
    <Screen>
      <div className="success-hero">
        <div className="checkring"><Icon name="users" className="lg" /></div>
        <h2>{isOrganizer ? `你是「${tripName}」的组织者` : `你已在「${tripName}」的队伍中`}</h2>
        <p className="hint">
          {isOrganizer
            ? '这个行程由你创建，你已在行程中，无需再加入。'
            : '这个账号已经是行程成员，无需再次加入，本次也没有重复加入。'}
        </p>
      </div>
      <a className="btn btn-primary" href={`#/trips/${tripId}`} style={{ marginTop: 8 }}>进入行程</a>
      <a className="btn btn-ghost" href="#/scan" style={{ marginTop: 8 }}>返回扫码</a>
    </Screen>
  )
}

export default function Join({ token }: JoinProps) {
  const { status, account, setPendingInvite, clearPendingInvite } = useAuth()
  const [state, setState] = useState<JoinState>({ kind: 'loading' })
  const [busy, setBusy] = useState<boolean>(false)
  const [actionError, setActionError] = useState<string>('')

  useEffect(() => {
    let active = true
    setState({ kind: 'loading' })
    api<InvitationPreview>(`/api/invitations/${encodeURIComponent(token)}`)
      .then((result) => {
        if (!active) return
        if (result.ok && result.data) {
          setState({ kind: 'ready', preview: result.data })
        } else if (result.status === 404) {
          setState({ kind: 'unusable' })
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
  }, [token])

  useEffect(() => {
    if (state.kind !== 'loading') clearPendingInvite()
  }, [state.kind, clearPendingInvite])

  async function accept() {
    if (state.kind !== 'ready') return
    if (status !== 'signedIn') {
      setPendingInvite(token)
      window.location.assign('/login')
      return
    }
    const preview = state.preview
    setBusy(true)
    setActionError('')
    try {
      const result = await api<AcceptResult>(
        `/api/invitations/${encodeURIComponent(token)}/accept`,
        { method: 'POST' },
      )
      if (result.ok && result.data) {
        // US-090: accepting an invitation switches the current trip; an already-member re-open never does.
        if (!result.data.alreadyMember) {
          const switched = await persistCurrentTrip(result.data.tripId)
          if (!switched) queueNotice('当前行程未切换，可在「我的行程」中手动选择这个行程。')
        }
        setState({
          kind: 'joined',
          preview,
          alreadyMember: result.data.alreadyMember,
          tripId: result.data.tripId,
        })
      } else if (result.status === 404) {
        setState({ kind: 'unusable' })
      } else if (result.status === 401) {
        setPendingInvite(token)
        window.location.assign('/login')
      } else if (!result.ok && result.status === 403 && result.data?.code === 'JOINING_CLOSED') {
        setState({ kind: 'closed', preview })
      } else {
        const data = result.ok ? null : result.data
        setActionError(data?.message ? `${data.code}: ${data.message}` : `请求失败（HTTP ${result.status}）`)
      }
    } catch (cause: unknown) {
      setActionError(`无法连接服务器：${errorMessage(cause)}`)
    } finally {
      setBusy(false)
    }
  }

  if (state.kind === 'loading') {
    return <Screen><div className="loading">正在打开邀请…</div></Screen>
  }

  if (state.kind === 'unusable') {
    return (
      <div className="screen">
        <header className="appbar">
          <div className="grow">
            <div className="title">邀请无法使用</div>
            <div className="sub">US-012 · 不泄露任何行程隐私</div>
          </div>
        </header>
        <div className="body">
          <div className="success-hero" style={{ paddingTop: 34 }}>
            <div className="checkring err"><Icon name="alert" className="lg" /></div>
            <h2>这个邀请链接已失效</h2>
            <p className="hint">
              链接可能已失效，或地址不正确。请联系邀请你的朋友重新获取。
            </p>
          </div>
          <section className="card pad" style={{ marginTop: 20, background: 'var(--surface-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, fontWeight: 650, color: 'var(--ink-2)' }}>
              <Icon name="shield" className="sm" /> 隐私保护
            </div>
            <p className="help" style={{ marginTop: 6 }}>
              为保护行程隐私，失效链接<b>不会展示</b>行程名称、成员、目的地等任何私有信息。
            </p>
          </section>
          <a className="btn btn-ghost" href="#/" style={{ marginTop: 16 }}>返回首页</a>
        </div>
      </div>
    )
  }

  if (state.kind === 'failed') {
    return (
      <Screen>
        <section className="card pad">
          <div className="success-hero" style={{ paddingTop: 10 }}>
            <div className="checkring err"><Icon name="alert" className="lg" /></div>
            <h2>无法加载邀请</h2>
            <p className="hint">{state.message}</p>
          </div>
          <a className="btn btn-ghost" href="#/">返回首页</a>
        </section>
      </Screen>
    )
  }

  if (state.kind === 'joined') {
    // User ruling 2026-11-17: an existing member re-accepting must see an
    // explicit "already in the team" notice, not the generic joined hero.
    if (state.alreadyMember) {
      return (
        <AlreadyMemberNotice
          tripName={state.preview.tripName}
          tripId={state.tripId}
          isOrganizer={account?.id === state.preview.organizerId}
        />
      )
    }
    return (
      <Screen>
        <div className="success-hero">
          <div className="checkring"><Icon name="check" className="lg" /></div>
          <h2>已加入「{state.preview.tripName}」</h2>
          <p className="hint">你现在是行程成员，可以查看完整行程信息。</p>
        </div>
        <a className="btn btn-primary" href={`#/trips/${state.tripId}`} style={{ marginTop: 8 }}>进入行程</a>
        <a className="btn btn-ghost" href="#/" style={{ marginTop: 8 }}>返回首页</a>
      </Screen>
    )
  }

  const preview = state.preview
  // Signed-in existing member: skip the preview/accept surface entirely.
  if (status === 'signedIn' && preview.viewerMember) {
    return (
      <AlreadyMemberNotice
        tripName={preview.tripName}
        tripId={preview.tripId}
        isOrganizer={account?.id === preview.organizerId}
      />
    )
  }
  const closed = state.kind === 'closed' || preview.mainPlanConfirmed
  const isOrganizer = status === 'signedIn' && account?.id === preview.organizerId

  return (
    <Screen>
      <section
        className="card pad"
        style={{ textAlign: 'center', background: 'linear-gradient(135deg,#f0fdfa,#fff)', borderColor: '#99f6e4' }}
      >
        <div
          className="logo"
          style={{
            width: 44, height: 44, margin: '0 auto 10px', borderRadius: 13,
            display: 'grid', placeItems: 'center', color: '#fff',
            background: 'linear-gradient(135deg,var(--brand),#0891b2)',
          }}
        >
          <Icon name="branch" />
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>邀请你加入</div>
        <div style={{ fontSize: 21, fontWeight: 780, margin: '5px 0 3px' }}>{preview.tripName}</div>
        <div className="tiny muted" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Icon name="pin" className="sm" />
          {preview.destination} · {preview.startDate} – {preview.endDate}
        </div>
      </section>

      <div className="identity-line" style={{ marginTop: 16 }}>
        <span>{status === 'signedIn' ? '以当前账号加入' : '登录后加入'}</span>
        <b>{status === 'signedIn' ? (account?.name ?? '已登录账号') : '尚未登录'}</b>
      </div>
      <p className="help">
        {status === 'signedIn'
          ? '同一账号仅能加入一次，不会重复。'
          : '预览是公开的；点击加入会先打开登录页，登录后回到本预览，再由你确认加入。'}
      </p>

      <section className="card pad" style={{ marginTop: 14, background: 'var(--surface-2)' }}>
        <p className="hint">
          <Icon name="shield" className="sm" />{' '}
          {closed
            ? '主线方案已确认，新的成员不能再加入。'
            : '接受邀请后才会看到完整行程与成员。当前主线尚未确认，你可以加入。'}
        </p>
      </section>

      {actionError && <p role="alert" className="error">{actionError}</p>}

      {closed ? (
        <>
          <div style={{ marginTop: 14 }}>
            <span className="pill err"><span className="dot" /> 加入已关闭</span>
          </div>
          <a className="btn btn-ghost" href="#/" style={{ marginTop: 14 }}>返回首页</a>
        </>
      ) : isOrganizer ? (
        <>
          <section className="card pad" style={{ marginTop: 14, background: 'var(--brand-soft)', borderColor: '#99f6e4' }}>
            <p className="hint" style={{ color: 'var(--brand-ink)' }}>
              <Icon name="check" className="sm" /> 你是这个行程的创建者，已在行程中，无需再加入。
            </p>
          </section>
          <a className="btn btn-ghost" href="#/scan" style={{ marginTop: 14 }}>返回扫码</a>
        </>
      ) : (
        <>
          <button className="btn btn-primary" type="button" style={{ marginTop: 16 }} onClick={accept} disabled={busy}>
            <Icon name="check" className="sm" />
            {busy ? '正在加入…' : status === 'signedIn' ? '接受邀请并加入' : '登录后加入'}
          </button>
          <a className="btn btn-ghost" href="#/scan" style={{ marginTop: 10 }}>不接受</a>
        </>
      )}
    </Screen>
  )
}
