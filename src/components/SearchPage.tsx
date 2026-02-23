import { useState, useEffect, useCallback } from 'react'
import type { UserProfile } from '../lib/profileStorage'
import { useErrorToast } from '../contexts/ErrorToastContext'
import { API_BASE } from '../lib/apiBase'
import { SearchIcon } from './icons'
import { RateCard } from './RateCard'

type SearchUser = { username: string; displayName: string }
type SearchRate = {
  id: string
  raterName: string
  raterHandle: string
  gameName: string
  rating: number
  body: string
  createdAt: string
  timeAgo?: string
  commentCount?: number
  likeCount?: number
  bookmarkCount?: number
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

const DEBOUNCE_MS = 280

interface SearchPageProps {
  profile: UserProfile
  /** Initial query (e.g. from right sidebar) */
  initialQuery?: string
  onViewProfile: (username: string) => void
  onViewRate?: (rateId: string) => void
}

export function SearchPage({ profile, initialQuery = '', onViewProfile, onViewRate }: SearchPageProps) {
  const { showError } = useErrorToast()
  const [query, setQuery] = useState(initialQuery)
  const [users, setUsers] = useState<SearchUser[]>([])
  const [rates, setRates] = useState<SearchRate[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    setQuery((q) => (initialQuery !== q ? initialQuery : q))
  }, [initialQuery])

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (trimmed.length === 0) {
      setUsers([])
      setRates([])
      setSearched(false)
      return
    }
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(trimmed)}`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setUsers(Array.isArray(data.users) ? data.users : [])
      const rawRates = Array.isArray(data.rates) ? data.rates : []
      setRates(
        rawRates.map((r: SearchRate & { createdAt?: string }) => ({
          ...r,
          timeAgo: formatTimeAgo(r.createdAt || new Date().toISOString()),
        }))
      )
    } catch {
      setUsers([])
      setRates([])
      showError('Search failed')
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query, runSearch])

  const currentUsername = profile.username?.trim()
  const handleLike = async (rateId: string) => {
    if (!currentUsername) return
    try {
      const res = await fetch(`${API_BASE}/api/rates/${encodeURIComponent(rateId)}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: profile.username }),
      })
      if (!res.ok) {
        showError('Could not like')
        return
      }
      const data = await res.json().catch(() => ({}))
      setRates((prev) =>
        prev.map((r) => (r.id === rateId ? { ...r, liked: true, likeCount: data.likeCount ?? (r.likeCount ?? 0) + 1 } : r))
      )
    } catch {
      showError('Could not like')
    }
  }
  const handleUnlike = async (rateId: string) => {
    if (!currentUsername) return
    try {
      const res = await fetch(`${API_BASE}/api/rates/${encodeURIComponent(rateId)}/like`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: profile.username }),
      })
      if (!res.ok) {
        showError('Could not unlike')
        return
      }
      const data = await res.json().catch(() => ({}))
      setRates((prev) =>
        prev.map((r) => (r.id === rateId ? { ...r, liked: false, likeCount: data.likeCount ?? Math.max(0, (r.likeCount ?? 1) - 1) } : r))
      )
    } catch {
      showError('Could not unlike')
    }
  }
  const handleBookmark = async (rateId: string) => {
    if (!currentUsername) return
    try {
      const res = await fetch(`${API_BASE}/api/rates/${encodeURIComponent(rateId)}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: profile.username }),
      })
      if (!res.ok) {
        showError('Could not save')
        return
      }
      const data = await res.json().catch(() => ({}))
      setRates((prev) =>
        prev.map((r) => (r.id === rateId ? { ...r, bookmarked: true, bookmarkCount: data.bookmarkCount ?? (r.bookmarkCount ?? 0) + 1 } : r))
      )
    } catch {
      showError('Could not save')
    }
  }
  const handleUnbookmark = async (rateId: string) => {
    if (!currentUsername) return
    try {
      const res = await fetch(`${API_BASE}/api/rates/${encodeURIComponent(rateId)}/bookmark`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: profile.username }),
      })
      if (!res.ok) {
        showError('Could not unsave')
        return
      }
      const data = await res.json().catch(() => ({}))
      setRates((prev) =>
        prev.map((r) => (r.id === rateId ? { ...r, bookmarked: false, bookmarkCount: data.bookmarkCount ?? Math.max(0, (r.bookmarkCount ?? 1) - 1) } : r))
      )
    } catch {
      showError('Could not unsave')
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-80px)] flex-1 flex-col border-x border-surface-border bg-surface md:min-h-screen">
      <div className="sticky top-0 z-10 border-b border-surface-border bg-surface/95 px-4 py-4 backdrop-blur">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, games, or rates"
            className="w-full rounded-full border border-surface-border/70 bg-surface-hover/80 py-3 pl-12 pr-4 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] shadow-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <p className="py-4 text-center text-sm text-[var(--color-text-muted)]">Searching…</p>
        )}
        {!loading && query.trim() && !searched && (
          <p className="py-4 text-center text-sm text-[var(--color-text-muted)]">Type to search.</p>
        )}
        {!loading && searched && query.trim() && users.length === 0 && rates.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">No people or rates found.</p>
        )}
        {!loading && (users.length > 0 || rates.length > 0) && (
          <div className="space-y-8">
            {users.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  People
                </h2>
                <ul className="space-y-1 rounded-xl border border-surface-border bg-surface-elevated overflow-hidden">
                  {users.map((u) => (
                    <li key={u.username}>
                      <button
                        type="button"
                        onClick={() => onViewProfile(u.username)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-hover text-gold-400">
                          {u.displayName[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[var(--color-text)]">{u.displayName}</p>
                          <p className="text-sm text-[var(--color-text-muted)]">@{u.username}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {rates.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Rates
                </h2>
                <div className="space-y-1">
                  {rates.map((rate) => (
                    <RateCard
                      key={rate.id}
                      {...rate}
                      timeAgo={rate.timeAgo ?? formatTimeAgo(rate.createdAt)}
                      currentUsername={profile.username}
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
                      platform={rate.platform}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
        {!query.trim() && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
            <SearchIcon className="h-12 w-12 text-[var(--color-text-muted)]" />
            <p className="max-w-[280px] text-sm text-[var(--color-text-muted)]">
              Search for people, games, or rates.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
