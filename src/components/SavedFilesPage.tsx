import { useState, useEffect } from 'react'
import type { UserProfile } from '../lib/profileStorage'
import { useErrorToast } from '../contexts/ErrorToastContext'
import { API_BASE } from '../lib/apiBase'
import { RateCard } from './RateCard'
import { BookmarkIcon } from './icons'
import { RateCardSkeleton } from './RateCardSkeleton'

type SavedRateItem = {
  id: string
  raterName: string
  raterHandle: string
  gameName: string
  rating: number
  body: string
  timeAgo: string
  commentCount: number
  likeCount: number
  bookmarkCount: number
  repostCount: number
  liked?: boolean
  bookmarked?: boolean
  platform?: 'ps' | 'xbox' | 'pc' | ''
}

function formatTimeAgo(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime()
  if (ms < 60_000) return 'Now'
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)}m`
  if (ms < 86400_000) return `${Math.floor(ms / 3600_000)}h`
  if (ms < 604800_000) return `${Math.floor(ms / 86400_000)}d`
  return `${Math.floor(ms / 604800_000)}w`
}

interface SavedFilesPageProps {
  profile: UserProfile
  onViewProfile?: (username: string) => void
  onViewRate?: (rateId: string) => void
}

export function SavedFilesPage({ profile, onViewProfile, onViewRate }: SavedFilesPageProps) {
  const { showError } = useErrorToast()
  const [rates, setRates] = useState<SavedRateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const username = profile.username?.trim()

  async function fetchSavedRates() {
    if (!username) {
      setRates([])
      setLoading(false)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const params = new URLSearchParams({ bookmarkedBy: username, username })
      const res = await fetch(`${API_BASE}/api/rates?${params}`)
      if (!res.ok) throw new Error('Failed to load saved rates')
      const data = await res.json()
      setRates(
        (Array.isArray(data) ? data : []).map((r: SavedRateItem & { createdAt: string }) => ({
          id: r.id,
          raterName: r.raterName,
          raterHandle: r.raterHandle,
          gameName: r.gameName,
          rating: r.rating,
          body: r.body,
          timeAgo: formatTimeAgo(r.createdAt),
          commentCount: r.commentCount ?? 0,
          likeCount: r.likeCount ?? 0,
          bookmarkCount: r.bookmarkCount ?? 0,
          repostCount: r.repostCount ?? 0,
          liked: r.liked,
          bookmarked: true,
          platform: r.platform ?? '',
        }))
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load saved files'
      setError(msg)
      setRates([])
      showError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSavedRates()
  }, [username])

  async function handleUnbookmark(rateId: string) {
    if (!username) return
    try {
      const res = await fetch(`${API_BASE}/api/rates/${encodeURIComponent(rateId)}/bookmark`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      if (!res.ok) {
        showError('Could not unsave')
        return
      }
      setRates((prev) => prev.filter((r) => r.id !== rateId))
    } catch {
      showError('Could not unsave')
    }
  }

  async function handleLike(rateId: string) {
    if (!username) return
    try {
      const res = await fetch(`${API_BASE}/api/rates/${encodeURIComponent(rateId)}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      if (!res.ok) {
        showError('Could not like')
        return
      }
      const data = await res.json().catch(() => ({}))
      setRates((prev) =>
        prev.map((r) => (r.id === rateId ? { ...r, liked: true, likeCount: data.likeCount ?? r.likeCount + 1 } : r))
      )
    } catch {
      showError('Could not like')
    }
  }

  async function handleUnlike(rateId: string) {
    if (!username) return
    try {
      const res = await fetch(`${API_BASE}/api/rates/${encodeURIComponent(rateId)}/like`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      if (!res.ok) {
        showError('Could not unlike')
        return
      }
      const data = await res.json().catch(() => ({}))
      setRates((prev) =>
        prev.map((r) => (r.id === rateId ? { ...r, liked: false, likeCount: data.likeCount ?? Math.max(0, r.likeCount - 1) } : r))
      )
    } catch {
      showError('Could not unlike')
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-80px)] flex-1 flex-col border-x border-surface-border bg-surface md:min-h-screen">
      <div className="sticky top-0 z-10 border-b border-surface-border bg-surface/95 py-4 pl-4 backdrop-blur">
        <h1 className="text-xl font-bold text-[var(--color-text)]">Saved files</h1>
      </div>
      <div className="flex flex-1 flex-col p-4">
        {error && (
          <p className="mb-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
        )}
        {!username ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
            <BookmarkIcon className="h-12 w-12 text-[var(--color-text-muted)]" />
            <p className="max-w-[280px] text-sm text-[var(--color-text-muted)]">
              Sign in to see your saved rates.
            </p>
          </div>
        ) : loading ? (
          <div className="space-y-1">
            {Array.from({ length: 3 }).map((_, idx) => (
              <RateCardSkeleton key={idx} />
            ))}
          </div>
        ) : rates.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
            <BookmarkIcon className="h-12 w-12 text-[var(--color-text-muted)]" />
            <p className="max-w-[280px] text-sm text-[var(--color-text-muted)]">
              No saved rates yet. Tap the bookmark on any rate in the feed to save it here.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {rates.map((rate) => (
              <RateCard
                key={rate.id}
                {...rate}
                currentUsername={profile.username}
                liked={rate.liked}
                onLike={() => handleLike(rate.id)}
                onUnlike={() => handleUnlike(rate.id)}
                bookmarked={true}
                onUnbookmark={() => handleUnbookmark(rate.id)}
                currentUserDisplayName={profile.displayName}
                onCommentAdded={(newCount) =>
                  setRates((prev) =>
                    prev.map((r) => (r.id === rate.id ? { ...r, commentCount: newCount } : r)),
                  )
                }
                platform={rate.platform}
                onRaterClick={onViewProfile}
                onViewRate={onViewRate}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
