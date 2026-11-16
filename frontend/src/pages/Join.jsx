import { useEffect, useState } from 'react'
import { api } from '../api.js'
import Icon from '../Icons.jsx'

function Screen({ children }) {
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

export default function Join({ token, userId, userName }) {
  const [state, setState] = useState({ kind: 'loading' })
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let active = true
    setState({ kind: 'loading' })
    api(`/api/invitations/${encodeURIComponent(token)}`)
      .then(({ status, ok, data }) => {
        if (!active) return
        if (ok && data) setState({ kind: 'ready', preview: data })
        else if (status === 404) setState({ kind: 'unusable' })
        else setState({ kind: 'failed', message: data?.message ?? `HTTP ${status}` })
      })
      .catch((cause) => {
        if (active) setState({ kind: 'failed', message: cause.message })
      })
    return () => {
      active = false
    }
  }, [token])

  async function accept() {
    setBusy(true)
    setActionError('')
    try {
      const { status, ok, data } = await api(
        `/api/invitations/${encodeURIComponent(token)}/accept`,
        { userId, method: 'POST' },
      )
      if (ok && data) {
        setState({ kind: 'joined', preview: state.preview, alreadyMember: data.alreadyMember })
      } else if (status === 404) {
        setState({ kind: 'unusable' })
      } else if (status === 403 && data?.code === 'JOINING_CLOSED') {
        setState({ kind: 'closed', preview: state.preview })
      } else {
        setActionError(data?.message ? `${data.code}: ${data.message}` : `请求失败（HTTP ${status}）`)
      }
    } catch (cause) {
      setActionError(`无法连接服务器：${cause.message}`)
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
    return (
      <Screen>
        <div className="success-hero">
          <div className="checkring"><Icon name="check" className="lg" /></div>
          <h2>已加入「{state.preview.tripName}」</h2>
          <p className="hint">
            {state.alreadyMember
              ? '你已经是这个行程的成员，本次没有重复加入。'
              : '你现在是行程成员，可以查看完整行程信息。'}
          </p>
        </div>
        <a className="btn btn-primary" href="#/" style={{ marginTop: 8 }}>返回首页</a>
      </Screen>
    )
  }

  const preview = state.preview
  const closed = state.kind === 'closed' || preview.mainPlanConfirmed

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
        <span>以当前身份加入</span>
        <b>{userName ?? '未选择身份'}</b>
      </div>
      <p className="help">
        身份在页面顶部的 scaffold 选择器切换；同一身份仅能加入一次，不会重复。
      </p>

      <section className="card pad" style={{ marginTop: 14, background: 'var(--surface-2)' }}>
        <p className="hint">
          <Icon name="shield" className="sm" style={{ verticalAlign: -3, color: closed ? 'var(--err)' : 'var(--brand)' }} />{' '}
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
      ) : (
        <button className="btn btn-primary" type="button" style={{ marginTop: 16 }} onClick={accept} disabled={busy}>
          <Icon name="check" className="sm" />
          {busy ? '正在加入…' : '接受邀请并加入'}
        </button>
      )}
    </Screen>
  )
}
