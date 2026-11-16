import { useCallback, useEffect, useRef, useState, type FocusEvent } from 'react'
import QRCode from 'qrcode'
import { api, errorMessage } from '../api'
import Icon from '../Icons'
import type { InvitationIssue } from '../types'

interface InvitationPanelProps {
  tripId: number
  userId: number
  isOrganizer: boolean
  userName: string | undefined
}

type InvitationState =
  | { kind: 'loading' }
  | { kind: 'denied'; message?: string }
  | { kind: 'failed'; message: string | undefined }
  | { kind: 'ready'; invitation: InvitationIssue }

function invitationUrl(joinPath: string): string {
  return `${window.location.origin}${window.location.pathname}#${joinPath}`
}

async function copyText(text: string, fallbackField: HTMLInputElement | null): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Permission denied: fall through to the selection-based fallback.
    }
  }
  fallbackField?.select()
  if (!document.execCommand('copy')) {
    throw new Error('copy is not available')
  }
}

export default function InvitationPanel({ tripId, userId, isOrganizer, userName }: InvitationPanelProps) {
  const [state, setState] = useState<InvitationState>({ kind: isOrganizer ? 'loading' : 'denied' })
  const [copied, setCopied] = useState<boolean>(false)
  const [qrFailed, setQrFailed] = useState<boolean>(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const urlRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(() => {
    let active = true
    setState({ kind: 'loading' })
    api<InvitationIssue>(`/api/trips/${tripId}/invitation`, { userId, method: 'POST' })
      .then((result) => {
        if (!active) return
        if (result.ok && result.data) {
          setState({ kind: 'ready', invitation: result.data })
        } else if (!result.ok && result.status === 403) {
          setState({ kind: 'denied', message: result.data?.message })
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
  }, [tripId, userId])

  useEffect(() => {
    if (!isOrganizer) {
      setState({ kind: 'denied' })
      return undefined
    }
    return load()
  }, [isOrganizer, load])

  useEffect(() => {
    if (state.kind !== 'ready' || !canvasRef.current) return
    setQrFailed(false)
    QRCode.toCanvas(canvasRef.current, invitationUrl(state.invitation.joinPath), {
      width: 130,
      margin: 1,
      color: { dark: '#1c1917', light: '#ffffff' },
    }).catch(() => setQrFailed(true))
  }, [state])

  async function copy(): Promise<void> {
    if (state.kind !== 'ready') return
    try {
      await copyText(invitationUrl(state.invitation.joinPath), urlRef.current)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      urlRef.current?.select()
    }
  }

  return (
    <>
      <div className="sec-title"><Icon name="link" className="sm" /> 邀请朋友</div>

      {state.kind === 'loading' && (
        <section className="card pad"><div className="loading">正在生成邀请链接…</div></section>
      )}

      {state.kind === 'denied' && (
        <section className="card pad">
          <div className="valid-item" style={{ borderBottom: 0 }}>
            <span className="valid-ic"><Icon name="shield" className="sm" /></span>
            <div>
              <div className="vt">只有组织者可以分享邀请链接</div>
              <div className="vd">
                当前身份是 {userName ?? '成员'}。切换到组织者身份后可生成链接和二维码。
              </div>
            </div>
          </div>
        </section>
      )}

      {state.kind === 'failed' && (
        <section className="card pad">
          <p role="alert" className="error">{state.message}</p>
          <button className="btn btn-ghost" type="button" style={{ marginTop: 12 }} onClick={load}>
            重试
          </button>
        </section>
      )}

      {state.kind === 'ready' && (
        <>
          <section className="card pad qr-card">
            {qrFailed ? (
              <div className="qr-placeholder">二维码生成失败，请使用链接复制</div>
            ) : (
              <canvas ref={canvasRef} aria-label="Invitation QR code" />
            )}
            <div style={{ fontSize: 14, fontWeight: 680 }}>扫码或分享链接加入</div>
            <p className="tiny muted" style={{ marginTop: 4 }}>
              朋友需在<b>主线方案确认前</b>加入 · 每人仅加入一次
            </p>
          </section>

          <div className="sec-title"><Icon name="link" className="sm" /> 邀请链接</div>
          <div className="linkbox">
            <Icon name="link" className="sm" />
            <input
              ref={urlRef}
              className="url"
              readOnly
              value={invitationUrl(state.invitation.joinPath)}
              onFocus={(event: FocusEvent<HTMLInputElement>) => event.currentTarget.select()}
              aria-label="Invitation URL"
            />
            <button className="iconbtn" type="button" onClick={copy} aria-label="Copy invitation link">
              <Icon name={copied ? 'check' : 'copy'} className="sm" />
            </button>
          </div>
          <button className="btn btn-ghost" type="button" style={{ marginTop: 12 }} onClick={copy}>
            <Icon name={copied ? 'check' : 'copy'} className="sm" />
            {copied ? '已复制' : '复制链接'}
          </button>
        </>
      )}
    </>
  )
}
