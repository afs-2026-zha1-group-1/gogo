import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api'
import Icon from '../Icons'
import type { CurrentTripResponse, TripListItem, TripListResponse } from '../types'
import { isEnded, todayIso } from '../lib/trip-date'
import { isCurrentTripResponse } from '../lib/current-trip'
import { tripPhoto } from '../lib/trip-photo'
import ConfirmDialog from '../components/ui/confirm-dialog'

type ListState =
  | { kind: 'loading' }
  | { kind: 'ready'; trips: TripListItem[] }
  | { kind: 'failed'; message: string }

interface TripsListProps {
  title?: string
  subtitle?: string
  /** Picker mode: tapping a row stores it as the current trip and tags the card; no navigation. */
  selectable?: boolean
  selectionInFlight?: boolean
  onSelectionStart?: () => number
  onSelectionFinish?: (selectionId: number | undefined, succeeded: boolean) => void
}

export default function TripsList({
  title = '我的行程',
  subtitle,
  selectable = false,
  selectionInFlight = false,
  onSelectionStart,
  onSelectionFinish,
}: TripsListProps) {
  const [state, setState] = useState<ListState>({ kind: 'loading' })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [currentTripLoading, setCurrentTripLoading] = useState(true)
  const [selectError, setSelectError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<TripListItem | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [selecting, setSelecting] = useState(false)

  useEffect(() => {
    let active = true
    setState({ kind: 'loading' })
    api<TripListResponse>('/api/trips')
      .then((result) => {
        if (!active) return
        if (result.ok && result.data) {
          setState({ kind: 'ready', trips: result.data.trips })
          return
        }
        const message = result.ok
          ? '无法读取行程列表'
          : result.data?.message ?? `请求失败（HTTP ${result.status}）`
        setState({ kind: 'failed', message })
      })
      .catch((cause: unknown) => {
        if (active) setState({ kind: 'failed', message: `无法连接服务器：${errorMessage(cause)}` })
      })
    return () => {
      active = false
    }
  }, [reloadKey])

  useEffect(() => {
    if (!selectable || selectionInFlight) return
    let active = true
    setCurrentTripLoading(true)
    api<unknown>('/api/trips/current')
      .then((result) => {
        if (!active) return
        if (result.ok && isCurrentTripResponse(result.data)) setSelectedId(result.data.tripId)
        else setSelectError('无法读取当前行程')
        setCurrentTripLoading(false)
      })
      .catch((cause: unknown) => {
        if (active) {
          setSelectError(`无法读取当前行程：${errorMessage(cause)}`)
          setCurrentTripLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [selectable, reloadKey, selectionInFlight])

  async function pick(trip: TripListItem) {
    setSelectError('')
    setSelecting(true)
    const selectionId = onSelectionStart?.()
    let succeeded = false
    try {
      const result = await api<CurrentTripResponse>('/api/trips/current', {
        method: 'PUT',
        body: { tripId: trip.id },
      })
      if (result.ok && result.data?.tripId === trip.id) {
        setSelectedId(result.data.tripId)
        succeeded = true
        return
      }
      const message = result.ok ? '设置当前行程失败' : result.data?.message ?? `请求失败（HTTP ${result.status}）`
      console.error('Unable to select the current trip', message)
      setSelectError(message)
    } catch (cause: unknown) {
      console.error('Unable to select the current trip', cause)
      setSelectError(`无法连接服务器：${errorMessage(cause)}`)
    } finally {
      setSelecting(false)
      onSelectionFinish?.(selectionId, succeeded)
    }
  }

  /** Deleting is organizer-only and confirmed first; the list reloads from the server. */
  async function confirmDelete() {
    const trip = pendingDelete
    if (!trip) return
    setPendingDelete(null)
    setDeleteError('')
    setDeletingId(trip.id)
    try {
      const result = await api<unknown>(`/api/trips/${trip.id}`, { method: 'DELETE' })
      if (result.ok) {
        if (selectedId === trip.id) setSelectedId(null)
        setReloadKey((key) => key + 1)
        return
      }
      const message = result.data?.message ?? `请求失败（HTTP ${result.status}）`
      console.error('Unable to delete the trip', message)
      setDeleteError(`无法删除「${trip.name}」：${message}`)
    } catch (cause: unknown) {
      console.error('Unable to delete the trip', cause)
      setDeleteError(`无法删除「${trip.name}」：${errorMessage(cause)}`)
    } finally {
      setDeletingId(null)
    }
  }

  const count = state.kind === 'ready' ? state.trips.length : 0
  const appbar = (
    <header className="appbar">
      <div className="logo"><Icon name="list" /></div>
      <div className="grow">
        <div className="title">{title}</div>
        <div className="sub">{subtitle ?? (state.kind === 'ready' ? (count ? `${count} 个行程` : '还没有行程') : '我创建和加入的行程')}</div>
      </div>
    </header>
  )

  if (state.kind === 'loading' || (state.kind === 'ready' && selectable && !selectionInFlight && currentTripLoading)) {
    return (
      <div className="screen">
        {appbar}
        <div className="body"><div className="loading">正在加载行程…</div></div>
      </div>
    )
  }

  if (state.kind === 'failed') {
    return (
      <div className="screen">
        {appbar}
        <div className="body">
          <div className="empty">
            <Icon name="alert" />
            <p>行程加载失败</p>
            <p className="hint" role="alert">{state.message}</p>
            <button className="btn btn-ghost" type="button" style={{ marginTop: 12 }} onClick={() => setReloadKey((key) => key + 1)}>
              重试
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (state.trips.length === 0) {
    return (
      <div className="screen">
        {appbar}
        <div className="body">
          {selectError && <p role="alert" className="error" style={{ marginBottom: 10 }}>{selectError}</p>}
          {deleteError && <p role="alert" className="error" style={{ marginBottom: 10 }}>{deleteError}</p>}
          <div className="empty">
            <Icon name="list" />
            <p>还没有行程</p>
            <p className="hint">创建行程或接受朋友的邀请</p>
          </div>
          <a className="btn btn-ghost" href="#/create">
            <Icon name="plus" className="sm" />
            创建行程
          </a>
        </div>
      </div>
    )
  }

  const today = todayIso()
  return (
    <div className="screen">
      {appbar}
      <div className="body">
        {selectError && <p role="alert" className="error" style={{ marginBottom: 10 }}>{selectError}</p>}
        {deleteError && <p role="alert" className="error" style={{ marginBottom: 10 }}>{deleteError}</p>}
        {state.trips.map((trip) => {
          const selected = selectable && selectedId === trip.id
          const busy = selecting || selectionInFlight || deletingId === trip.id
          const body = (
            <>
              <span
                className="qi trip-thumb"
                aria-hidden="true"
                style={{ ['--thumb-photo' as string]: tripPhoto(trip.destination, trip.id) }}
              >
                <Icon name="pin" />
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span className="qt" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', overflowWrap: 'anywhere' }}>
                  {trip.name}
                  {trip.organizer && <span className="pill brand">我创建的</span>}
                  {isEnded(trip.endDate, today) && <span className="pill warn">已结束</span>}
                </span>
                <span className="qd" style={{ display: 'block', overflowWrap: 'anywhere' }}>
                  {trip.destination} · {trip.startDate} – {trip.endDate}
                </span>
              </span>
              {selected && <span className="pill ok qtag">已选择</span>}
            </>
          )
          // The delete control is a sibling of the card body, never a nested button,
          // and only the organizer's own trips expose it.
          return (
            <div key={trip.id} className={`qcard qcard-row${selected ? ' selected' : ''}${busy ? ' busy' : ''}`}>
              {selectable ? (
                <button
                  type="button"
                  className="qcard-main"
                  aria-pressed={selected}
                  disabled={busy}
                  onClick={() => pick(trip)}
                >
                  {body}
                </button>
              ) : (
                <a className="qcard-main" href={`#/trips/${trip.id}`}>
                  {body}
                </a>
              )}
              {trip.organizer && (
                <button
                  type="button"
                  className="qcard-delete"
                  aria-label="删除行程"
                  title="删除行程"
                  disabled={busy}
                  onClick={() => {
                    setDeleteError('')
                    setPendingDelete(trip)
                  }}
                >
                  <Icon name="trash" className="sm" />
                </button>
              )}
            </div>
          )
        })}
        <a className="btn btn-ghost" style={{ marginTop: 16 }} href="#/create">
          <Icon name="plus" className="sm" />
          创建行程
        </a>
      </div>
      <ConfirmDialog
        open={pendingDelete !== null}
        tone="warn"
        title="删除这个行程？"
        lines={[
          `「${pendingDelete?.name ?? ''}」的成员、邀请、偏好和方案会一并删除。`,
          '删除后无法恢复。',
        ]}
        confirmLabel="删除"
        cancelLabel="取消"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
