import { useState, useEffect } from 'react'
import { useErrorToast } from '../contexts/ErrorToastContext'
import { API_BASE } from '../lib/apiBase'
import { SearchIcon } from './icons'

type TrendingGame = { rank: number; gameName: string; count: number }

function formatRateCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K rates`
  return `${count} rate${count === 1 ? '' : 's'}`
}

interface RightSidebarProps {
  className?: string
  searchQuery?: string
  onSearchQueryChange?: (value: string) => void
  onSearchNavigate?: () => void
}

export function RightSidebar({ className = '', searchQuery = '', onSearchQueryChange, onSearchNavigate }: RightSidebarProps) {
  const { showError } = useErrorToast()
  const [trending, setTrending] = useState<TrendingGame[]>([])

  useEffect(() => {
    fetch(`${API_BASE}/api/rates/trending`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setTrending(Array.isArray(data) ? data : []))
      .catch(() => setTrending([]))
  }, [])

  return (
    <aside
      className={`hidden flex-col gap-4 overflow-y-auto pl-4 pr-4 pt-2 lg:flex lg:min-w-[300px] xl:min-w-[var(--right-sidebar-width)] ${className}`}
    >
      {/* Search */}
      <div className="sticky top-0 z-10 bg-surface/95 pb-3 pt-1 backdrop-blur-xl">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange?.(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearchNavigate?.() }}
            placeholder="Search games & raters"
            className="w-full rounded-full border border-surface-border/70 bg-surface-elevated/80 py-3 pl-12 pr-4 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] shadow-sm focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/50"
          />
        </div>
      </div>

      {/* Premium card */}
      <div className="rounded-2xl border border-surface-border/70 bg-gradient-to-br from-surface-elevated/80 via-surface/90 to-surface-elevated/80 p-4 shadow-gold-glow/40">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--color-text)]">
            Subscribe to Premium
          </h2>
          <span className="rounded-full bg-gold-500/20 px-2 py-0.5 text-xs font-semibold text-gold-400">
            50% off
          </span>
        </div>
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">
          Get ad-free experience, unlock gamer badges, and see deep rating analytics.
        </p>
        <button
          type="button"
          onClick={() => showError('Premium coming soon')}
          className="w-full rounded-full bg-gold-500 py-2.5 font-bold text-black transition-colors hover:bg-gold-400"
        >
          Subscribe
        </button>
      </div>

      {/* Trending games — most rated, 1st to 5th */}
      <div className="overflow-hidden rounded-2xl border border-surface-border/70 bg-surface-elevated/90">
        <h2 className="px-4 py-3 text-xl font-bold text-[var(--color-text)]">
          Trending games
        </h2>
        <div className="divide-y divide-surface-border">
          {trending.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[var(--color-text-muted)]">No rates yet. Rate games to see trends.</p>
          ) : (
            trending.map((item) => (
              <button
                key={item.rank}
                type="button"
                onClick={() => {
                  onSearchQueryChange?.(item.gameName)
                  onSearchNavigate?.()
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover"
              >
                <span className="text-lg font-bold text-[var(--color-text-muted)]">
                  {item.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--color-text)]">
                    {item.gameName}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {formatRateCount(item.count)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </aside>
  )
}
