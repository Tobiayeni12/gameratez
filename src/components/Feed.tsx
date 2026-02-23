import { useState, useEffect } from 'react'
import type { UserProfile } from '../lib/profileStorage'
import { useErrorToast } from '../contexts/ErrorToastContext'
import { API_BASE } from '../lib/apiBase'
import { RateCard } from './RateCard'
import { RateComposeModal } from './RateComposeModal'

type RateItem = {
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
  images?: string[]
  platform?: 'ps' | 'xbox' | 'pc' | ''
}

/** API rate shape (has createdAt instead of timeAgo; liked/bookmarked from server when username in query) */
type ApiRate = RateItem & { createdAt: string; liked?: boolean; bookmarked?: boolean }

function formatTimeAgo(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime()
  if (ms < 60_000) return 'Now'
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)}m`
  if (ms < 86400_000) return `${Math.floor(ms / 3600_000)}h`
  if (ms < 604800_000) return `${Math.floor(ms / 86400_000)}d`
  return `${Math.floor(ms / 604800_000)}w`
}

function apiRateToItem(r: ApiRate): RateItem {
  return {
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
    bookmarked: r.bookmarked,
    images: Array.isArray((r as any).images) ? (r as any).images : undefined,
    platform: (r as any).platform ?? '',
  }
}

interface FeedProps {
  profile: UserProfile
  activeTab: 'for-you' | 'following'
  onTabChange: (tab: 'for-you' | 'following') => void
  composeOpen: boolean
  onComposeOpen: () => void
  onComposeClose: () => void
  className?: string
  /** When set, @handle on rate cards opens this user's profile */
  onViewProfile?: (username: string) => void
  /** When set, rate cards show "View" and open this rate in detail */
  onViewRate?: (rateId: string) => void
}

export function Feed({
  profile,
  activeTab,
  onTabChange,
  composeOpen,
  onComposeOpen,
  onComposeClose,
  className = '',
  onViewProfile,
  onViewRate,
}: FeedProps) {
  const { showError } = useErrorToast()
  const [rates, setRates] = useState<RateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set())

  async function fetchFollowing() {
    const username = profile.username?.trim()
    if (!username) return
    try {
      const res = await fetch(`/api/following?username=${encodeURIComponent(username)}`)
      if (!res.ok) return
      const list: string[] = await res.json()
      setFollowingSet(new Set(list.map((u) => u.toLowerCase())))
    } catch {
      // ignore
    }
  }

  async function fetchRates() {
    setError(null)
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeTab === 'following' && profile.username) params.set('tab', 'following')
      if (profile.username) params.set('username', profile.username)
      const url = `${API_BASE}/api/rates` + (params.toString() ? '?' + params.toString() : '')
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load rates')
      const data: ApiRate[] = await res.json()
      setRates(data.map(apiRateToItem))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load feed'
      setError(msg)
      showError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRates()
  }, [activeTab, profile.username])

  useEffect(() => {
    fetchFollowing()
  }, [profile.username])

  async function handleComposeSubmit(payload: { gameName: string; rating: number; body: string; images?: string[]; scheduledAt?: string | null }) {
    try {
      const res = await fetch(`${API_BASE}/api/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameName: payload.gameName,
          rating: payload.rating,
          body: payload.body,
          images: payload.images,
          scheduledAt: payload.scheduledAt,
          platform: profile.platform,
          raterName: profile.displayName,
          raterHandle: profile.username,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to post rate')
      }
      const created: ApiRate = await res.json()
      setRates((prev) => [apiRateToItem(created), ...prev])
      onComposeClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not post rate'
      setError(msg)
      showError(msg)
    }
  }

  async function handleFollow(raterHandle: string) {
    const username = profile.username?.trim()
    if (!username) return
    try {
      const res = await fetch(`${API_BASE}/api/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerUsername: username, followeeUsername: raterHandle }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showError(data.error || 'Could not follow')
        return
      }
      setFollowingSet((prev) => new Set(prev).add(raterHandle.toLowerCase()))
    } catch {
      showError('Could not follow')
    }
  }

  async function handleLike(rateId: string) {
    const username = profile.username?.trim()
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
      const newCount = data.likeCount ?? 0
      setRates((prev) =>
        prev.map((r) => (r.id === rateId ? { ...r, liked: true, likeCount: newCount } : r))
      )
    } catch {
      showError('Could not like')
    }
  }

  async function handleBookmark(rateId: string) {
    const username = profile.username?.trim()
    if (!username) return
    try {
      const res = await fetch(`${API_BASE}/api/rates/${encodeURIComponent(rateId)}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      if (!res.ok) {
        showError('Could not save')
        return
      }
      const data = await res.json().catch(() => ({}))
      const newCount = data.bookmarkCount ?? 0
      setRates((prev) =>
        prev.map((r) => (r.id === rateId ? { ...r, bookmarked: true, bookmarkCount: newCount } : r))
      )
    } catch {
      showError('Could not save')
    }
  }

  async function handleUnbookmark(rateId: string) {
    const username = profile.username?.trim()
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
      const data = await res.json().catch(() => ({}))
      const newCount = data.bookmarkCount ?? 0
      setRates((prev) =>
        prev.map((r) => (r.id === rateId ? { ...r, bookmarked: false, bookmarkCount: newCount } : r))
      )
    } catch {
      showError('Could not unsave')
    }
  }

  async function handleUnlike(rateId: string) {
    const username = profile.username?.trim()
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
      const newCount = data.likeCount ?? 0
      setRates((prev) =>
        prev.map((r) => (r.id === rateId ? { ...r, liked: false, likeCount: newCount } : r))
      )
    } catch {
      showError('Could not unlike')
    }
  }

  async function handleUnfollow(raterHandle: string) {
    const username = profile.username?.trim()
    if (!username) return
    try {
      const res = await fetch(`${API_BASE}/api/follow`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerUsername: username, followeeUsername: raterHandle }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showError(data.error || 'Could not unfollow')
        return
      }
      setFollowingSet((prev) => {
        const next = new Set(prev)
        next.delete(raterHandle.toLowerCase())
        return next
      })
    } catch {
      showError('Could not unfollow')
    }
  }

  const platformLabel =
    profile.platform === 'ps'
      ? 'PlayStation'
      : profile.platform === 'xbox'
        ? 'Xbox'
        : profile.platform === 'pc'
          ? 'PC'
          : null

  return (
    <main className={`flex min-h-0 flex-1 flex-col border-x border-surface-border ${className}`}>
      {/* Tabs — For you | Following */}
      <div className="sticky top-0 z-10 border-b border-surface-border bg-surface/95 backdrop-blur">
        <div className="flex">
          <button
            type="button"
            onClick={() => onTabChange('for-you')}
            className="flex-1 border-b-2 border-transparent py-4 text-center font-semibold transition-colors hover:bg-surface-hover hover:text-[var(--color-accent)]"
            style={{
              color: activeTab === 'for-you' ? 'var(--color-text)' : 'var(--color-text-muted)',
              borderBottom: activeTab === 'for-you' ? '2px solid var(--color-gold)' : '2px solid transparent',
            }}
          >
            For you
          </button>
          <button
            type="button"
            onClick={() => onTabChange('following')}
            className="flex-1 border-b-2 border-transparent py-4 text-center font-semibold transition-colors hover:bg-surface-hover hover:text-[var(--color-accent)]"
            style={{
              color: activeTab === 'following' ? 'var(--color-text)' : 'var(--color-text-muted)',
              borderBottom: activeTab === 'following' ? '2px solid var(--color-gold)' : '2px solid transparent',
            }}
          >
            Following
          </button>
        </div>
        {/* Your primary platform — always visible while scrolling */}
        {platformLabel && (
          <div className="flex justify-center px-4 pb-2.5 pt-0.5">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white/95"
              style={{
                background:
                  profile.platform === 'ps'
                    ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                    : profile.platform === 'xbox'
                      ? 'linear-gradient(135deg, #16a34a, #15803d)'
                      : 'linear-gradient(135deg, #dc2626, #b91c1c)',
              }}
            >
              <span className="text-white/80">Playing on</span>
              <span>{platformLabel}</span>
            </span>
          </div>
        )}
      </div>

      {/* Compose — click to open rate modal */}
      <button
        type="button"
        onClick={onComposeOpen}
        className="flex w-full gap-3 border-b border-surface-border p-4 text-left transition-colors hover:bg-surface-hover/50"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-gold-400">
          <span className="text-lg font-semibold">U</span>
        </div>
        <div className="min-w-0 flex-1 py-3">
          <span className="text-[15px] text-[var(--color-text-muted)]">
            Rate a game...
          </span>
        </div>
      </button>

      <RateComposeModal
        profile={profile}
        isOpen={composeOpen}
        onClose={onComposeClose}
        onSubmit={handleComposeSubmit}
      />

      {/* Rate list */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <p className="border-b border-surface-border bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}
        {loading ? (
          <p className="p-6 text-center text-sm text-[var(--color-text-muted)]">Loading feed…</p>
        ) : rates.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--color-text-muted)]">
            {activeTab === 'following'
              ? 'No rates from people you follow yet. Follow someone from "For you" to see their rates here.'
              : 'No rates yet. Be the first to rate a game!'}
          </p>
        ) : (
          <div className="space-y-1">
            {rates.map((rate) => (
              <RateCard
                key={rate.id}
                {...rate}
                platform={rate.platform}
                currentUsername={profile.username}
                isFollowing={followingSet.has(rate.raterHandle.toLowerCase())}
                onFollow={() => handleFollow(rate.raterHandle)}
                onUnfollow={() => handleUnfollow(rate.raterHandle)}
                liked={rate.liked}
                onLike={() => handleLike(rate.id)}
                onUnlike={() => handleUnlike(rate.id)}
                bookmarked={rate.bookmarked}
                onBookmark={() => handleBookmark(rate.id)}
                onUnbookmark={() => handleUnbookmark(rate.id)}
                currentUserDisplayName={profile.displayName}
                onCommentAdded={(newCount) =>
                  setRates((prev) =>
                    prev.map((r) => (r.id === rate.id ? { ...r, commentCount: newCount } : r)),
                  )
                }
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
