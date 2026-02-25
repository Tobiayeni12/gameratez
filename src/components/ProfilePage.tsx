import { useState, useEffect } from 'react'
import { CreateProfileForm, type ProfileFormData } from './CreateProfileForm'
import type { UserProfile } from '../lib/profileStorage'
import { updateProfile, clearProfile, getDefaultProfile } from '../lib/profileStorage'
import { RateCard } from './RateCard'
import { useErrorToast } from '../contexts/ErrorToastContext'
import { API_BASE } from '../lib/apiBase'

type ProfileRateItem = {
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

interface ProfilePageProps {
  profile: UserProfile | null
  onProfileChange: (profile: UserProfile) => void
  onBack?: () => void
  /** When set (e.g. for Guest), show Sign in / Create account to open entry gate */
  onOpenEntryGate?: () => void
  /** When set, show this user's profile (read-only) with Follow / Message. Clear to show own profile. */
  viewUsername?: string | null
  /** When viewing another user, call when Message is clicked */
  onMessageClick?: (username: string) => void
}

export function ProfilePage({
  profile,
  onProfileChange,
  onBack,
  onOpenEntryGate,
  viewUsername = null,
  onMessageClick,
}: ProfilePageProps) {
  const { showError } = useErrorToast()
  const [isEditing, setIsEditing] = useState(false)
  const [rates, setRates] = useState<ProfileRateItem[]>([])
  const [ratesLoading, setRatesLoading] = useState(true)
  const [ratesError, setRatesError] = useState<string | null>(null)
  const [viewedUser, setViewedUser] = useState<{ username: string; displayName: string; platform?: 'ps' | 'xbox' | 'pc' | '' } | null>(null)
  const [isFollowingView, setIsFollowingView] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  const profileUsername = profile?.username?.trim()
  const raterHandle = viewUsername != null && viewUsername.trim() !== '' ? viewUsername.trim() : profileUsername

  useEffect(() => {
    if (viewUsername != null && viewUsername.trim() !== '') {
      fetch(`/api/users/profile?username=${encodeURIComponent(viewUsername)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) =>
          data
            ? setViewedUser({
                username: data.username,
                displayName: data.displayName,
                platform: data.platform ?? '',
              })
            : setViewedUser(null),
        )
        .catch(() => setViewedUser(null))
    } else {
      setViewedUser(null)
    }
  }, [viewUsername])

  useEffect(() => {
    if (!profileUsername || !viewUsername?.trim()) {
      setIsFollowingView(false)
      return
    }
    fetch(`${API_BASE}/api/following?username=${encodeURIComponent(profileUsername)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((list: string[]) => {
        const v = viewUsername.trim().toLowerCase()
        setIsFollowingView(list.some((u) => (u || '').toLowerCase() === v))
      })
      .catch(() => setIsFollowingView(false))
  }, [profileUsername, viewUsername])

  useEffect(() => {
    if (!raterHandle) {
      setRates([])
      setRatesLoading(false)
      return
    }
    setRatesLoading(true)
    setRatesError(null)
    const params = new URLSearchParams({ raterHandle })
    if (profileUsername) params.set('username', profileUsername)
    fetch(`${API_BASE}/api/rates?${params}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Array<ProfileRateItem & { createdAt: string }>) => {
        setRates(
          (Array.isArray(data) ? data : []).map((r) => ({
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
            platform: r.platform ?? '',
          })),
        )
      })
      .catch(() => {
        setRatesError('Could not load rates')
        showError('Could not load rates')
      })
      .finally(() => setRatesLoading(false))
  }, [raterHandle, profileUsername, showError])

  function handleUpdateSubmit(data: ProfileFormData) {
    if (!profile) return
    const updated = updateProfile({ ...profile, ...data })
    onProfileChange(updated)
    setIsEditing(false)
  }

  if (profile && isEditing) {
    return (
      <div className="min-h-full border-x border-surface-border px-4 py-6 md:px-6">
        {onBack && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="mb-4 text-sm font-medium text-gold-400 hover:underline"
          >
            ← Cancel
          </button>
        )}
        <CreateProfileForm
          initialDisplayName={profile.displayName}
          initialUsername={profile.username}
          initialBio={profile.bio}
          initialPlatform={profile.platform}
          onSubmit={handleUpdateSubmit}
        />
      </div>
    )
  }

  async function handleLike(rateId: string) {
    const username = profile?.username?.trim()
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

  async function handleUnlike(rateId: string) {
    const username = profile?.username?.trim()
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

  async function handleBookmark(rateId: string) {
    const username = profile?.username?.trim()
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
      setRates((prev) =>
        prev.map((r) =>
          r.id === rateId ? { ...r, bookmarked: true, bookmarkCount: data.bookmarkCount ?? r.bookmarkCount + 1 } : r
        )
      )
    } catch {
      showError('Could not save')
    }
  }

  async function handleUnbookmark(rateId: string) {
    const username = profile?.username?.trim()
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
      setRates((prev) =>
        prev.map((r) =>
          r.id === rateId ? { ...r, bookmarked: false, bookmarkCount: data.bookmarkCount ?? Math.max(0, r.bookmarkCount - 1) } : r
        )
      )
    } catch {
      showError('Could not unsave')
    }
  }

  const isViewingOther = viewUsername != null && viewUsername.trim() !== ''
  const displayUser = isViewingOther && viewedUser ? viewedUser : profile
  const showEdit = profile && !isViewingOther
  const showFollowMessage = isViewingOther && profile && viewedUser && profileUsername !== (viewedUser?.username ?? '').toLowerCase()

  if (profile || isViewingOther) {
    const displayPlatform =
      isViewingOther && viewedUser
        ? viewedUser.platform ?? ''
        : profile?.platform ?? ''

    const avatarRingClasses =
      displayPlatform === 'ps'
        ? 'ring-4 ring-blue-500/70 ring-offset-2 ring-offset-surface'
        : displayPlatform === 'xbox'
          ? 'ring-4 ring-emerald-500/70 ring-offset-2 ring-offset-surface'
          : displayPlatform === 'pc'
            ? 'ring-4 ring-red-500/70 ring-offset-2 ring-offset-surface'
            : ''
    return (
      <div className="min-h-full border-x border-surface-border px-4 py-6 md:px-6">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-4 text-sm font-medium text-gold-400 hover:underline"
          >
            ← Back
          </button>
        )}
        <div className="rounded-2xl border border-surface-border bg-surface-elevated p-6">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-surface-hover text-3xl font-bold text-gold-400 ${avatarRingClasses}`}
            >
              {(displayUser?.displayName ?? viewedUser?.displayName ?? '?')[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-[var(--color-text)]">
                {displayUser?.displayName ?? viewedUser?.displayName ?? (isViewingOther ? 'Loading…' : '?')}
              </h1>
              <p className="text-gold-400">@{displayUser?.username ?? viewedUser?.username ?? viewUsername ?? ''}</p>
              {!isViewingOther && profile?.bio && (
                <p className="mt-3 text-[var(--color-text)]">{profile.bio}</p>
              )}
              {showFollowMessage && viewedUser && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={followLoading}
                    onClick={async () => {
                      if (!profileUsername || !viewedUser) return
                      setFollowLoading(true)
                      try {
                        if (isFollowingView) {
                          const res = await fetch(`${API_BASE}/api/follow`, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ followerUsername: profileUsername, followeeUsername: viewedUser.username }),
                          })
                          if (res.ok) setIsFollowingView(false)
                          else {
                            const data = await res.json().catch(() => ({}))
                            showError(data.error || 'Could not unfollow')
                          }
                        } else {
                          const res = await fetch(`${API_BASE}/api/follow`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ followerUsername: profileUsername, followeeUsername: viewedUser.username }),
                          })
                          if (res.ok) setIsFollowingView(true)
                          else {
                            const data = await res.json().catch(() => ({}))
                            showError(data.error || 'Could not follow')
                          }
                        }
                      } finally {
                        setFollowLoading(false)
                      }
                    }}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 ${
                      isFollowingView
                        ? 'border-surface-border bg-transparent text-[var(--color-text)] hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400'
                        : 'border-gold-500/60 bg-gold-500/10 text-gold-400 hover:bg-gold-500/25 hover:shadow-gold-glow'
                    }`}
                  >
                    {followLoading ? '…' : isFollowingView ? 'Following' : 'Follow'}
                  </button>
                  {onMessageClick && (
                    <button
                      type="button"
                      onClick={() => onMessageClick(viewedUser.username)}
                      className="rounded-full border border-surface-border bg-surface-hover px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:border-[var(--color-accent)] hover:bg-surface-elevated hover:text-[var(--color-accent)]"
                    >
                      Message
                    </button>
                  )}
                </div>
              )}
              {!isViewingOther && onOpenEntryGate && (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={onOpenEntryGate}
                    className="rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gold-400"
                  >
                    Sign in / Create account
                  </button>
                </div>
              )}
              {showEdit && (
                <div className="mt-4 flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-2 text-sm font-medium text-gold-400 transition-colors hover:bg-gold-500/20"
                  >
                    Edit profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearProfile()
                      onProfileChange(getDefaultProfile())
                      if (onBack) onBack()
                    }}
                    className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rates */}
        <div className="mt-6 border-t border-surface-border pt-6">
          <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">Rates</h2>
          {ratesError && (
            <p className="mb-3 text-sm text-red-400">{ratesError}</p>
          )}
          {ratesLoading ? (
            <p className="py-4 text-center text-sm text-[var(--color-text-muted)]">Loading rates…</p>
          ) : rates.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">
              No rates yet. {isViewingOther ? '' : 'Post from the feed to see them here.'}
            </p>
          ) : (
            <div className="space-y-1">
              {rates.map((rate) => (
                <RateCard
                  key={rate.id}
                  {...rate}
                  currentUsername={profile?.username}
                  liked={rate.liked}
                  onLike={() => handleLike(rate.id)}
                  onUnlike={() => handleUnlike(rate.id)}
                  bookmarked={rate.bookmarked}
                  onBookmark={() => handleBookmark(rate.id)}
                  onUnbookmark={() => handleUnbookmark(rate.id)}
                  currentUserDisplayName={profile?.displayName}
                  onCommentAdded={(newCount) =>
                    setRates((prev) =>
                      prev.map((r) => (r.id === rate.id ? { ...r, commentCount: newCount } : r)),
                    )
                  }
                  onRaterClick={isViewingOther ? undefined : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
