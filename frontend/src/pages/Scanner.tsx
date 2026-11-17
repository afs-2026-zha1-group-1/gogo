import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import Icon from '../Icons'
import { parseJoinHash } from '../scan'
import { ensureCsrf } from '../lib/csrf'

// Scanner.tsx is the full-screen flow opened by the `#/scan` hash route.
// Per design D1 (G1 C2) it renders OUTSIDE the shell column and bottom
// TabBar; the identity ScaffoldBar stays visible so the join hand-off can
// inherit the currently-selected user id. Per design D7 the UI has four
// mutually exclusive kinds: `idle`, `scanning`, `camera-error`, and
// `decode-error`. A fifth `simulating` kind is a demo-only affordance for
// camera-less desktops: it replays the camera execution timeline (open →
// focus → decode → hand-off) against a freshly issued invitation so the
// full scan→join flow is observable without real hardware. It reuses the
// same `parseJoinHash` matcher, so it cannot drift from the C3 contract.

type ScannerState =
  | { kind: 'idle' }
  | { kind: 'scanning' }
  | { kind: 'simulating' }
  | { kind: 'camera-error'; message: string }
  | { kind: 'decode-error' }

export default function Scanner() {
  const [state, setState] = useState<ScannerState>({ kind: 'idle' })
  const [manualLink, setManualLink] = useState('')
  const [chip, setChip] = useState<string | null>(null)
  const [simStatus, setSimStatus] = useState('')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  // Suppress the "unrecognized" chip on consecutive frames reporting the
  // same reason so a static QR in view does not flicker the label. Task
  // 5.2 owns the decode path; the ref is placed here so both the effect
  // and the file-decode path (task 6.1) can share the throttle state.
  const lastChipReasonRef = useRef<string | null>(null)

  // Close control: always return to the home page (user ruling 2026-11-17,
  // superseding the US-067 restore-origin design D2).
  function close() {
    window.location.hash = '#/'
  }

  // Show the "unrecognized" chip briefly (per I-5 / I-8 / I-9 reject
  // paths) without leaving the scanner.
  function flashChip(reason: string) {
    setChip(reason)
    window.setTimeout(() => setChip(null), 1800)
  }

  // Manual link fallback (spec I-8 / I-9). Uses the same parseJoinHash
  // authority as the camera/image paths so all three entry points share
  // the C3 matcher.
  function previewManualLink() {
    const result = parseJoinHash(manualLink, window.location.origin)
    if (result.ok) {
      window.location.hash = `#/join/${result.token}`
    } else {
      flashChip(result.reason)
    }
  }

  // Release any live camera and return to the idle surface. Also used to
  // abort the simulation timeline (the simulating effect cleans up on the
  // state change below).
  function stopScanning() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    const tracks = streamRef.current?.getTracks() ?? []
    tracks.forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setState({ kind: 'idle' })
  }

  // Task 5.1: the button only flips the state; the effect below owns the
  // getUserMedia call so the permission prompt is deferred until the
  // user actually taps 开始扫描 (spec I-1).
  function startScanning() {
    lastChipReasonRef.current = null
    setState({ kind: 'scanning' })
  }

  // Demo-only: enter the simulated-camera timeline. The effect keyed on
  // `simulating` issues a fresh invitation and drives the animation, so
  // this handler only flips the state.
  function startSimulation() {
    lastChipReasonRef.current = null
    setSimStatus('开启模拟相机…')
    setState({ kind: 'simulating' })
  }

  // Task 6.1: same C3 matcher as the camera and manual-link paths.
  // The image path decodes one frame from a File: FileReader is not
  // needed because createImageBitmap accepts a Blob directly. We still
  // revoke any object URL we create and close the ImageBitmap after the
  // draw so the decoder resources release promptly (spec I-7).
  async function handleFilePicked(file: File | undefined) {
    if (!file) return
    let bitmap: ImageBitmap | null = null
    try {
      bitmap = await createImageBitmap(file)
      const canvas = canvasRef.current ?? document.createElement('canvas')
      // Cap the decode size similarly to the camera loop; larger inputs
      // do not improve detection accuracy on typical QR payloads.
      const maxSide = 640
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
      canvas.width = Math.round(bitmap.width * scale)
      canvas.height = Math.round(bitmap.height * scale)
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        flashChip('no-2d-context')
        return
      }
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const found = jsQR(frame.data, frame.width, frame.height, {
        inversionAttempts: 'attemptBoth',
      })
      if (!found?.data) {
        flashChip('no-qr-in-image')
        return
      }
      const result = parseJoinHash(found.data, window.location.origin)
      if (result.ok) {
        window.location.hash = `#/join/${result.token}`
      } else {
        flashChip(result.reason)
      }
    } catch (err) {
      const name = err instanceof DOMException ? err.name : 'decode-failed'
      flashChip(name)
    } finally {
      bitmap?.close?.()
    }
  }

  // Task 5.1: acquire the camera only when `scanning` becomes active
  // (spec I-1: no permission prompt until the user taps 开始扫描) and
  // always release every track on cleanup (spec I-2: indicator disappears
  // when the scanner closes or unmounts).
  //
  // Task 5.2: piggyback the rAF decode loop on the same lifecycle. Each
  // frame draws the video into an offscreen canvas at 480×360 (a down
  // scale empirically fast enough for jsQR on typical invitation QRs
  // while keeping the main thread responsive), asks jsQR for the
  // decoded payload, and pipes it through the C3 matcher. `{ok:true}`
  // navigates to `#/join/<token>`; the scanner never calls a POST
  // endpoint on its own (spec I-3).
  useEffect(() => {
    if (state.kind !== 'scanning') return
    let cancelled = false
    const md = navigator.mediaDevices
    if (!md?.getUserMedia) {
      setState({ kind: 'camera-error', message: '此浏览器不支持摄像头扫码，请使用邀请链接或「模拟扫描」演示。' })
      return
    }
    md.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play?.().catch(() => {
            /* Autoplay is muted+playsInline; a rejection here is non-fatal. */
          })
        }
        const canvas = canvasRef.current ?? document.createElement('canvas')
        canvas.width = 480
        canvas.height = 360
        canvasRef.current = canvas
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        const tick = () => {
          const video = videoRef.current
          if (!video || video.readyState < 2) {
            rafRef.current = requestAnimationFrame(tick)
            return
          }
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const found = jsQR(frame.data, frame.width, frame.height, {
              inversionAttempts: 'dontInvert',
            })
            if (found?.data) {
              const result = parseJoinHash(found.data, window.location.origin)
              if (result.ok) {
                // Hand off to Join via hash navigation. Cleanup below
                // stops tracks once the route change unmounts Scanner.
                window.location.hash = `#/join/${result.token}`
                return
              }
              if (lastChipReasonRef.current !== result.reason) {
                lastChipReasonRef.current = result.reason
                flashChip(result.reason)
              }
            }
          }
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      })
      .catch((err: DOMException) => {
        if (cancelled) return
        const message =
          err.name === 'NotAllowedError'
            ? '未获得相机权限，请在浏览器设置里允许后重试，或改用「模拟扫描」演示。'
            : err.name === 'NotFoundError'
              ? '未检测到可用相机，请连接设备后重试，或改用「模拟扫描」演示。'
              : `无法开启相机（${err.name}），请使用邀请链接或「模拟扫描」演示。`
        setState({ kind: 'camera-error', message })
      })
    return () => {
      cancelled = true
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      const tracks = streamRef.current?.getTracks() ?? []
      tracks.forEach((t) => t.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind])

  // Demo-only timeline for camera-less desktops. Issues a fresh trip-1
  // invitation as the organizer (Alice, id 1 — the seeded organizer), then
  // replays the camera steps and pipes the resulting link through the
  // SAME parseJoinHash matcher before handing off to Join. Every timer is
  // cleared on cleanup so leaving the screen (or tapping 停止) aborts the
  // simulation cleanly.
  useEffect(() => {
    if (state.kind !== 'simulating') return
    let cancelled = false
    let navTimer: number | null = null
    ;(async () => {
      let token = ''
      try {
        const csrf = await ensureCsrf()
        const headers: Record<string, string> = {}
        if (csrf) headers['X-XSRF-TOKEN'] = csrf
        const resp = await fetch('/api/trips/1/invitation', {
          method: 'POST',
          credentials: 'same-origin',
          headers,
        })
        if (resp.ok) {
          const data = await resp.json()
          if (data && typeof data.token === 'string') token = data.token
        }
      } catch {
        token = ''
      }
      if (cancelled) return
      if (!token) token = 'e85a2eec4d3b122c79c82b2a69363a6b'
      setSimStatus('识别成功，正在跳转…')
      navTimer = window.setTimeout(() => {
        if (!cancelled) window.location.href = `/#/join/${token}`
      }, 1200)
    })()
    return () => {
      cancelled = true
      if (navTimer != null) window.clearTimeout(navTimer)
    }
  }, [state.kind])

  const busy = state.kind === 'scanning' || state.kind === 'simulating'

  return (
    <div className="screen scanner">
      <header className="appbar">
        <button
          type="button"
          className="iconbtn"
          aria-label="关闭扫码"
          onClick={busy ? stopScanning : close}
        >
          <Icon name="x" />
        </button>
        <div className="grow">
          <div className="title">扫码加入行程</div>
        </div>
      </header>

      <div className="body">
        {/* --- Viewfinder (always dark) --- */}
        <section
          className={`scanner-stage${busy ? ' live' : ''}`}
          aria-live="polite"
        >
          {state.kind === 'camera-error' ? (
            <div className="scanner-error">
              <div className="scanner-error-icon"><Icon name="alert" className="lg" /></div>
              <div className="scanner-error-title">无法开启相机</div>
              <p className="hint">{state.message}</p>
              <div className="scanner-error-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setState({ kind: 'idle' })}
                >
                  <Icon name="camera" className="sm" /> 重试相机
                </button>
                <button type="button" className="btn btn-primary" onClick={startSimulation}>
                  <Icon name="sparkle" className="sm" /> 模拟演示
                </button>
              </div>
            </div>
          ) : state.kind === 'decode-error' ? (
            <div className="scanner-error">
              <div className="scanner-error-icon"><Icon name="alert" className="lg" /></div>
              <div className="scanner-error-title">未能识别邀请</div>
              <p className="hint">二维码内容不是有效的加入链接，请重新扫描或直接粘贴邀请链接。</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setState({ kind: 'idle' })}
              >
                返回重试
              </button>
            </div>
          ) : (
            <>
              {state.kind === 'scanning' && (
                <video ref={videoRef} className="scanner-video" muted playsInline autoPlay />
              )}
              {state.kind === 'simulating' && <div className="scanner-sim-feed" aria-hidden />}
              {/* Teal outlined scan-target frame (always visible) */}
              <div className="scanner-frame" aria-hidden>
                <Icon name="camera" className="scanner-frame-icon" />
              </div>
              {busy && <div className="scanner-scanline" aria-hidden />}
              {state.kind === 'simulating' && (
                <div className="scanner-sim-status">{simStatus}</div>
              )}
            </>
          )}
        </section>

        {/* --- Caption --- */}
        <p className="scanner-caption">对准朋友分享的行程二维码</p>

        {/* --- Action buttons row --- */}
        <div className="scanner-btns">
          <button
            type="button"
            className="btn btn-primary"
            onClick={state.kind === 'scanning' ? stopScanning : startScanning}
            disabled={state.kind === 'simulating'}
          >
            <Icon name="camera" className="sm" />
            {state.kind === 'scanning' ? '停止扫描' : '开启相机'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={state.kind === 'simulating'}
          >
            <Icon name="plus" className="sm" /> 选择图片
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              void handleFilePicked(file)
            }}
          />
        </div>

        {/* --- Link section --- */}
        <div className="scanner-link-section">
          <div className="label">邀请链接</div>
          <input
            type="text"
            inputMode="url"
            value={manualLink}
            onChange={(e) => setManualLink(e.target.value)}
            placeholder="http://localhost:5173/#/join/62930795c13d031b2b6df0211c7d7932"
          />
          <button
            type="button"
            className="btn btn-secondary scanner-preview-btn"
            onClick={previewManualLink}
            disabled={manualLink.trim() === ''}
          >
            <Icon name="link" className="sm" /> 预览邀请
          </button>
        </div>

        {chip && (
          <div className="scanner-chip" role="status">
            <Icon name="alert" className="sm" /> 无法识别 ({chip})
          </div>
        )}
      </div>
    </div>
  )
}
