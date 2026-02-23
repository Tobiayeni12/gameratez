import { useState, useEffect } from 'react'
import type { UserProfile } from '../lib/profileStorage'
import { useErrorToast } from '../contexts/ErrorToastContext'
import { API_BASE } from '../lib/apiBase'
import { BellIcon, HeartIcon } from './icons'

type NotificationItem = {
  id: string
  type: 'like' | 'follow' | 'comment'
  createdAt: string
  read: boolean
  forUsername: string
  actorUsername: string
  actorDisplayName?: string
  rateId?: string
  gameName?: string
  body?: string
}

function formatNotifTime(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime()
  if (ms < 60_000) return 'Now'
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)}m`
  if (ms < 86400_000) return `${Math.floor(ms / 3600_000)}h`
  if (ms < 604800_000) return `${Math.floor(ms / 86400_000)}d`
  return `${Math.floor(ms / 604800_000)}w`
}

function NotificationRow({
  n,
  onMarkRead,
}: {
  n: NotificationItem
  onMarkRead: (id: string) => void
}) {
  const actor = n.actorDisplayName || `@${n.actorUsername}`
  const text =
    n.type === 'like'
      ? n.gameName
        ? `liked your rate on ${n.gameName}`
        : 'liked your rate'
      : n.type === 'follow'
        ? 'followed you'
        : n.body
          ? `commented on your rate: "${n.body}"`
          : 'commented on your rate'
  return (
    <button
      type="button"
      onClick={() => onMarkRead(n.id)}
      className={`flex w-full gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:bg-surface-hover/50 ${
        n.read ? 'border-surface-border bg-surface-elevated/30' : 'border-gold-500/30 bg-gold-500/5'
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-gold-400">
        {n.type === 'like' ? (
          <HeartIcon className="h-5 w-5 text-red-400" />
        ) : (
          <span className="text-sm font-semibold">{n.actorUsername[0]?.toUpperCase() ?? '?'}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] text-[var(--color-text)]">
          <span className="font-semibold">{actor}</span>{' '}
          <span className="text-[var(--color-text-muted)]">{text}</span>
        </p>
        <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{formatNotifTime(n.createdAt)}</p>
      </div>
    </button>
  )
}

interface NotificationsPageProps {
  profile: UserProfile
  /** Called when user marks one or all as read so App can refresh unread badge */
  onNotificationsUpdated?: () => void
}

export function NotificationsPage({ profile, onNotificationsUpdated }: NotificationsPageProps) {
  const { showError } = useErrorToast()
  const [list, setList] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const username = profile.username?.trim()

  async function fetchNotifications() {
    if (!username) {
      setList([])
      setLoading(false)
      return
    }
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/notifications?username=${encodeURIComponent(username)}`)
      if (!res.ok) throw new Error('Failed to load notifications')
      const data = await res.json()
      setList(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load notifications')
      setList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [username])

  async function markRead(id: string) {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/${encodeURIComponent(id)}/read`, {
        method: 'PATCH',
      })
      if (res.ok) {
        setList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
        onNotificationsUpdated?.()
      } else showError('Could not mark as read')
    } catch {
      showError('Could not mark as read')
    }
  }

  async function markAllRead() {
    if (!username) return
    try {
      const res = await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      if (res.ok) {
        setList((prev) => prev.map((n) => ({ ...n, read: true })))
        onNotificationsUpdated?.()
      } else showError('Could not mark all as read')
    } catch {
      showError('Could not mark all as read')
    }
  }

  const unreadCount = list.filter((n) => !n.read).length

  return (
    <main className="flex min-h-[calc(100vh-80px)] flex-1 flex-col border-x border-surface-border bg-surface md:min-h-screen">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-border bg-surface/95 py-4 pl-4 pr-4 backdrop-blur">
        <h1 className="text-xl font-bold text-[var(--color-text)]">Notifications</h1>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-sm font-medium text-gold-400 hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {error && (
          <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
        )}
        {!username ? (
          <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">
            Sign in to see your notifications.
          </p>
        ) : loading ? (
          <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">Loading…</p>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-surface-border py-12 text-center">
            <BellIcon className="h-12 w-12 text-[var(--color-text-muted)]" />
            <p className="max-w-[280px] text-sm text-[var(--color-text-muted)]">
              You're all caught up. Likes, new followers, and comments will show here.
            </p>
          </div>
        ) : (
          list.map((n) => <NotificationRow key={n.id} n={n} onMarkRead={markRead} />)
        )}
      </div>
    </main>
  )
}
