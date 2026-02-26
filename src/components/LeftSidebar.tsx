import type { UserProfile } from '../lib/profileStorage'
import { BellIcon, BookmarkIcon, ExploreIcon, HomeIcon, MessageIcon, MoreIcon, UserIcon } from './icons'
import { useState, useEffect, useRef } from 'react'

interface LeftSidebarProps {
  profile: UserProfile
  onFeedClick: () => void
  onFollowingClick: () => void
  onMessagesClick: () => void
  onRateClick: () => void
  onProfileClick: () => void
  onNotificationsClick: () => void
  onSavedFilesClick: () => void
  onSignOut: () => void
  isFeedActive?: boolean
  isFollowingActive?: boolean
  isMessagesActive?: boolean
  isProfileActive?: boolean
  isNotificationsActive?: boolean
  isSavedFilesActive?: boolean
  notificationUnreadCount?: number
  className?: string
}

export function LeftSidebar({
  profile,
  onFeedClick,
  onFollowingClick,
  onMessagesClick,
  onRateClick,
  onProfileClick,
  onNotificationsClick,
  onSavedFilesClick,
  onSignOut,
  isFeedActive = false,
  isFollowingActive = false,
  isMessagesActive = false,
  isProfileActive = false,
  isNotificationsActive = false,
  isSavedFilesActive = false,
  notificationUnreadCount = 0,
  className = '',
}: LeftSidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <aside
      className={`flex h-full flex-col border-r border-surface-border/60 bg-surface/70 backdrop-blur-xl md:items-stretch ${className}`}
    >
      <div className="flex h-full w-full flex-col items-stretch gap-3 px-3 py-4 md:px-5">
        {/* Logo */}
        <a
          href="/"
          className="flex items-center justify-start rounded-2xl px-3 py-2 transition-colors hover:bg-surface-hover/70"
          aria-label="Gameratez Home"
        >
          <img
            src="/gameratez-logo.png"
            alt="Gameratez"
            className="h-16 w-auto max-w-[360px] object-contain md:h-24 md:max-w-[520px]"
          />
        </a>

        {/* Nav — For you, Following, Notifications, Profile */}
        <nav className="mt-2 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={onFeedClick}
            className={`nav-item ${isFeedActive ? 'active' : ''}`}
          >
            <HomeIcon className="h-7 w-7 shrink-0" />
            <span>For you</span>
          </button>
          <button
            type="button"
            onClick={onFollowingClick}
            className={`nav-item ${isFollowingActive ? 'active' : ''}`}
          >
            <ExploreIcon className="h-7 w-7 shrink-0" />
            <span>Following</span>
          </button>
          <button
            type="button"
            onClick={onNotificationsClick}
            className={`nav-item ${isNotificationsActive ? 'active' : ''}`}
          >
            <BellIcon className="h-7 w-7 shrink-0" count={notificationUnreadCount} />
            <span>Notifications</span>
          </button>
          <button
            type="button"
            onClick={onMessagesClick}
            className={`nav-item ${isMessagesActive ? 'active' : ''}`}
          >
            <MessageIcon className="h-7 w-7 shrink-0" />
            <span>Messages</span>
          </button>
          <button
            type="button"
            onClick={onSavedFilesClick}
            className={`nav-item ${isSavedFilesActive ? 'active' : ''}`}
          >
            <BookmarkIcon className="h-7 w-7 shrink-0" />
            <span>Saved files</span>
          </button>
          <button
            type="button"
            onClick={onProfileClick}
            className={`nav-item ${isProfileActive ? 'active' : ''}`}
          >
            <UserIcon className="h-7 w-7 shrink-0" />
            <span>Profile</span>
          </button>
        </nav>

        {/* Rate button */}
        <button
          type="button"
          onClick={onRateClick}
          className="mt-4 w-full rounded-full bg-gradient-to-r from-gold-500 via-gold-400 to-[var(--color-accent)] py-3.5 text-[15px] font-bold text-black shadow-gold-glow transition-transform transition-colors hover:brightness-110 hover:shadow-lg active:scale-95 md:min-w-[220px]"
        >
          Rate a game
        </button>

        {/* User profile at bottom — use saved account */}
        {/* profile summary + menu
             make this container positioned so the absolute dropdown can align to the
             “more” button rather than stretching the full sidebar width. */}
        <div className="relative mt-auto flex w-full items-center gap-3 rounded-2xl bg-surface-elevated/60 p-3 ring-1 ring-surface-border/60 transition-colors hover:bg-surface-hover/70" ref={menuRef}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-hover text-gold-400 shadow-gold-bubble">
            <span className="text-sm font-semibold">
              {profile.displayName[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-[var(--color-text)]">
              {profile.displayName}
            </p>
            <p className="truncate text-sm text-[var(--color-text-muted)]">
              @{profile.username}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-full p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-gold-500/10 hover:text-gold-400"
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <MoreIcon className="h-5 w-5 shrink-0" />
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-max min-w-[200px] z-50 overflow-hidden rounded-2xl bg-surface-elevated py-1 shadow-xl ring-1 ring-surface-border">
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] text-[var(--color-text)] transition-colors hover:bg-surface-hover"
                onClick={() => {
                  setMenuOpen(false)
                  onSignOut()
                }}
              >
                <span>Sign out account</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
