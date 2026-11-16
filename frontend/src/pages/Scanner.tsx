import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import Icon from '../Icons'
import { parseJoinHash } from '../scan'

// Scanner.tsx is the full-screen flow opened by the `#/scan` hash route.
// Per design D1 (G1 C2) it renders OUTSIDE the shell column and bottom
// TabBar; the identity ScaffoldBar stays visible so the join hand-off can
// inherit the currently-selected user id. Per design D7 the UI has four
// mutually exclusive kinds: `idle`, `scanning`, `camera-error`, and
// `decode-error`. Tasks 5–7 grow this file from the idle surface authored
// in task 4.1.

type ScannerState =
  | { kind: 'idle' }
  | { kind: 'scanning' }
  | { kind: 'camera-error'; message: string }
  | { kind: 'decode-error' }

export default function Scanner({ from }: { from: string | null }) {
  const [state, setState] = useState<ScannerState>({ kind: 'idle' })
  const [manualLink, setManualLink] = useState('')
  const [chip, setChip] = useState<string | null>(null)
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

  // Close control: restore the hash that opened the scanner, falling back
  // to `#/` when the user typed `#/scan` directly (spec S-5 / design D2).
  function close() {
    window.location.hash = from ?? '#/'
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
      setState({ kind: 'camera-error', message: '此浏览器不支持摄像头扫码，请使用邀请链接。' })
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
            ? '未获得相机权限，请在浏览器设置里允许后重试。'
            : err.name === 'NotFoundError'
              ? '未检测到可用相机，请连接设备后重试。'
              : `无法开启相机（${err.name}），请使用邀请链接。`
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

  return (
    <div className="screen scanner">
      <header className="appbar">
        <div className="logo"><Icon name="scan" /></div>
        <div className="grow">
          <div className="title">扫码加入行程</div>
          <div className="sub">US-067 · 扫描二维码或输入邀请链接</div>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="关闭扫码"
          onClick={state.kind === 'scanning' ? stopScanning : close}
        >
          <Icon name="x" />
        </button>
      </header>

      <div className="body">
        <section
          className={`card scanner-preview${state.kind === 'scanning' ? ' live' : ''}`}
          aria-live="polite"
        >
          {state.kind === 'camera-error' ? (
            <div className="scanner-error">
              <div className="scanner-error-icon"><Icon name="alert" className="lg" /></div>
              <div className="scanner-error-title">无法开启相机</div>
              <p className="hint">{state.message}</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setState({ kind: 'idle' })}
              >
                <Icon name="camera" className="sm" /> 重试
              </button>
            </div>
          ) : state.kind === 'scanning' ? (
            <video
              ref={videoRef}
              className="scanner-video"
              muted
              playsInline
              autoPlay
            />
          ) : (
            <div className="scanner-idle-hint">
              <Icon name="camera" className="lg" />
              <p className="hint">点击下方「开始扫描」开启相机；也可以直接从相册选择二维码图片。</p>
            </div>
          )}
        </section>

        <div className="scanner-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={state.kind === 'scanning' ? stopScanning : startScanning}
          >
            <Icon name="camera" className="sm" />
            {state.kind === 'scanning' ? '停止扫描' : '开始扫描'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            从相册选择
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = '' // allow re-picking the same file
              void handleFilePicked(file)
            }}
          />
        </div>

        <section className="card scanner-link">
          <label className="field">
            <span className="label">或直接粘贴邀请链接</span>
            <input
              type="text"
              inputMode="url"
              value={manualLink}
              onChange={(e) => setManualLink(e.target.value)}
              placeholder="例如 #/join/<32-hex-token>"
            />
          </label>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={previewManualLink}
            disabled={manualLink.trim() === ''}
          >
            预览邀请
          </button>
          {chip && (
            <div className="scanner-chip" role="status">
              <Icon name="alert" className="sm" /> 无法识别 ({chip})
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
