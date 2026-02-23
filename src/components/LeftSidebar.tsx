import type { UserProfile } from '../lib/profileStorage'
import { BellIcon, BookmarkIcon, ExploreIcon, HomeIcon, MessageIcon, MoreIcon, UserIcon } from './icons'

interface LeftSidebarProps {
  profile: UserProfile
  onFeedClick: () => void
  onFollowingClick: () => void
  onMessagesClick: () => void
  onRateClick: () => void
  onProfileClick: () => void
  onNotificationsClick: () => void
  onSavedFilesClick: () => void
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
  isFeedActive = false,
  isFollowingActive = false,
  isMessagesActive = false,
  isProfileActive = false,
  isNotificationsActive = false,
  isSavedFilesActive = false,
  notificationUnreadCount = 0,
  className = '',
}: LeftSidebarProps) {
  return (
    <aside
      className={`flex flex-col border-r border-surface-border md:items-stretch ${className}`}
    >
      <div className="flex h-full w-full flex-col items-stretch gap-2 px-2 py-2 md:px-4">
        {/* Logo */}
        <a
          href="/"
          className="flex items-center justify-start rounded-full p-3 transition-colors hover:bg-surface-hover"
          aria-label="Gameratez Home"
        >
          <img
            src="/gameratez-logo.png"
            alt="Gameratez"
            className="h-20 w-auto max-w-[426px] object-contain md:h-32 md:max-w-[640px]"
          />
        </a>

        {/* Nav — For you, Following, Notifications, Profile */}
        <nav className="flex flex-col gap-1">
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
          className="mt-2 w-full rounded-full bg-gold-500 py-3.5 font-bold text-black transition-colors hover:bg-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-surface md:min-w-[220px]"
        >
          Rate
        </button>

        {/* User profile at bottom — use saved account */}
        <div className="mt-auto flex w-full items-center gap-3 rounded-full p-3 transition-colors hover:bg-surface-hover">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-gold-400">
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
          <MoreIcon className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]" />
        </div>
      </div>
    </aside>
  )
}
