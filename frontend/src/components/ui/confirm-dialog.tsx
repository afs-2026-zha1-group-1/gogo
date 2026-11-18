import { useEffect, useId } from 'react'
import Icon from '../../Icons'

interface ConfirmDialogProps {
  open: boolean
  title: string
  lines: string[]
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'ok' | 'warn'
  onConfirm: () => void
  onCancel: () => void
}

// In-app blocking confirmation. Native window.confirm is unstyled, blocking and
// cannot carry structured copy, so every destructive/plan-invalidating prompt
// renders through this dialog (Esc / backdrop / cancel all close without acting).
export default function ConfirmDialog({
  open,
  title,
  lines,
  confirmLabel = '确定',
  cancelLabel = '取消',
  tone = 'warn',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`dialog-icon ${tone}`}>
          <Icon name={tone === 'warn' ? 'alert' : 'check'} />
        </div>
        <div id={titleId} className="dialog-title">{title}</div>
        {lines.map((line) => (
          <p className="dialog-text" key={line}>{line}</p>
        ))}
        <div className="dialog-actions">
          <button className="btn btn-primary" type="button" onClick={onConfirm}>{confirmLabel}</button>
          <button className="btn btn-ghost" type="button" onClick={onCancel}>{cancelLabel}</button>
        </div>
      </div>
    </div>
  )
}
