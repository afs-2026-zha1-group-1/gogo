/**
 * Non-blocking generation notice (US-031-AI design D8). It stays visible for the
 * whole request and never covers the page, so members can still read or leave.
 */
export function AiGeneratingNotice() {
  return (
    <div className="ai-progress" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>AI 正在生成中…</span>
      <span className="ai-progress-sub">通常需要 10–30 秒</span>
    </div>
  )
}
