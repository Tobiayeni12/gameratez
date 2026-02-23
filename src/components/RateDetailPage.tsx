import { useState, useEffect } from 'react'
import type { UserProfile } from '../lib/profileStorage'
import { RateCard } from './RateCard'
import { useErrorToast } from '../contexts/ErrorToastContext'
import { API_BASE } from '../lib/apiBase'

function formatTimeAgo(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime()
  if (ms < 60_000) return 'Now'
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)}m`
  if (ms < 86400_000) return `${Math.floor(ms / 3600_000)}h`
  if (ms < 604800_000) return `${Math.floor(ms / 86400_000)}d`
  return `${Math.floor(ms / 604800_000)}w`
}

type RateDetail = {
  id: string
  raterName: string
  raterHandle: string
  gameName: string
  rating: number
  body: string
  createdAt: string
  commentCount?: number
  likeCount?: number
  bookmarkCount?: number
  repostCount?: number
  liked?: boolean
  bookmarked?: boolean
}

interface RateDetailPageProps {
  rateId: string
  profile: UserProfile
  onBack: () => void
  onViewProfile: (username: string) => void
}

export function RateDetailPage({ rateId, profile, onBack, onViewProfile }: RateDetailPageProps) {
  const { showError } = useErrorToast()
  const [rate, setRate] = useState<RateDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const username = profile.username?.trim()

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (username) params.set('username', username)
    fetch(`${API_BASE}/api/rates/${encodeURIComponent(rateId)}?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Rate not found' : 'Failed to load rate')
        return res.json()
      })
      .then((data) => setRate(data))
      .catch(() => {
        showError('Could not load rate')
        setRate(null)
      })
      .finally(() => setLoading(false))
  }, [rateId, username, showError])

  async function handleLike() {
    if (!username) return
    try {
      const res = await fetch(`${API_BASE}/api/rates/${encodeURIComponent(rateId)}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      if (!res.ok) return
      const data = await res.json().catch(() => ({}))
      setRate((r) => (r ? { ...r, liked: true, likeCount: data.likeCount ?? (r.likeCount ?? 0) + 1 } : r))
    } catch {
      showError('Could not like')
    }
  }

  async function handleUnlike() {
    if (!username) return
    try {
      const res = await fetch(`${API_BASE}/api/rates/${encodeURIComponent(rateId)}/like`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      if (!res.ok) return
      const data = await res.json().catch(() => ({}))
      setRate((r) => (r ? { ...r, liked: false, likeCount: data.likeCount ?? Math.max(0, (r.likeCount ?? 1) - 1) } : r))
    } catch {
      showError('Could not unlike')
    }
  }

  async function handleBookmark() {
    if (!username) return
    try {
      const res = await fetch(`${API_BASE}/api/rates/${encodeURIComponent(rateId)}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      if (!res.ok) return
      const data = await res.json().catch(() => ({}))
      setRate((r) => (r ? { ...r, bookmarked: true, bookmarkCount: data.bookmarkCount ?? (r.bookmarkCount ?? 0) + 1 } : r))
    } catch {
      showError('Could not save')
    }
  }

  async function handleUnbookmark() {
    if (!username) return
    try {
      const res = await fetch(`${API_BASE}/api/rates/${encodeURIComponent(rateId)}/bookmark`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      if (!res.ok) return
      const data = await res.json().catch(() => ({}))
      setRate((r) => (r ? { ...r, bookmarked: false, bookmarkCount: data.bookmarkCount ?? Math.max(0, (r.bookmarkCount ?? 1) - 1) } : r))
    } catch {
      showError('Could not unsave')
    }
  }

  return (
    <main className="min-h-[calc(100vh-80px)] flex-1 border-x border-surface-border bg-surface md:min-h-screen">
      <div className="sticky top-0 z-10 border-b border-surface-border bg-surface/95 px-4 py-4 backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-gold-400 hover:underline"
        >
          ← Back
        </button>
      </div>
      <div className="p-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Loading rate…</p>
        ) : !rate ? (
          <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Rate not found.</p>
        ) : (
          <RateCard
            id={rate.id}
            raterName={rate.raterName}
            raterHandle={rate.raterHandle}
            gameName={rate.gameName}
            rating={rate.rating}
            body={rate.body}
            timeAgo={formatTimeAgo(rate.createdAt)}
            commentCount={rate.commentCount ?? 0}
            likeCount={rate.likeCount ?? 0}
            bookmarkCount={rate.bookmarkCount ?? 0}
            repostCount={rate.repostCount ?? 0}
            currentUsername={profile.username}
            liked={rate.liked}
            onLike={handleLike}
            onUnlike={handleUnlike}
            bookmarked={rate.bookmarked}
            onBookmark={handleBookmark}
            onUnbookmark={handleUnbookmark}
            currentUserDisplayName={profile.displayName}
            onCommentAdded={(newCount) => setRate((r) => (r ? { ...r, commentCount: newCount } : r))}
            onRaterClick={onViewProfile}
          />
        )}
      </div>
    </main>
  )
}
