import { useEffect, useRef, useState } from 'react'
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

  // Placeholder until task 5.1 wires the real getUserMedia + rAF loop.
  // The button must remain clickable in `idle` so task 5 can pick up
  // the state transition without touching the surface markup.
  function startScanning() {
    setState({ kind: 'scanning' })
    // TODO(task 5.1): call navigator.mediaDevices.getUserMedia here and
    // attach the stream to videoRef; on success start the rAF decode loop;
    // on rejection set kind 'camera-error'.
  }

  function stopScanning() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    const track = streamRef.current?.getVideoTracks()[0]
    track?.stop()
    streamRef.current = null
    setState({ kind: 'idle' })
  }

  // Ensure the camera is released when the component unmounts (spec I-2,
  // design D4). Task 5.1 will start the rAF loop inside the `scanning`
  // effect and reuse this cleanup path.
  useEffect(() => {
    if (state.kind !== 'scanning') return
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      const track = streamRef.current?.getVideoTracks()[0]
      track?.stop()
    }
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
            onClick={() => {
              // TODO(task 6.1): trigger hidden <input type="file">
              flashChip('image-picker-pending')
            }}
          >
            从相册选择
          </button>
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
