import { BellIcon, HomeIcon, MessageIcon, SearchIcon } from './icons'

interface MobileBottomNavProps {
  onHomeClick: () => void
  onSearchClick: () => void
  onRateClick: () => void
  onNotificationsClick: () => void
  onMessagesClick: () => void
  isHomeActive?: boolean
  isSearchActive?: boolean
  isNotificationsActive?: boolean
  isMessagesActive?: boolean
  notificationUnreadCount?: number
}

export function MobileBottomNav({
  onHomeClick,
  onSearchClick,
  onRateClick,
  onNotificationsClick,
  onMessagesClick,
  isHomeActive = false,
  isSearchActive = false,
  isNotificationsActive = false,
  isMessagesActive = false,
  notificationUnreadCount = 0,
}: MobileBottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-surface-border bg-surface py-2 md:hidden"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <button
        type="button"
        onClick={onHomeClick}
        className={`flex flex-col items-center gap-0.5 rounded-full px-4 py-2 text-[var(--color-text-muted)] transition-colors hover:bg-surface-hover hover:text-[var(--color-text)] ${isHomeActive ? 'text-gold-400' : ''}`}
        aria-label="Home"
      >
        <HomeIcon className="h-6 w-6" />
        <span className="text-xs">Home</span>
      </button>
      <button
        type="button"
        onClick={onSearchClick}
        className={`flex flex-col items-center gap-0.5 rounded-full px-4 py-2 text-[var(--color-text-muted)] transition-colors hover:bg-surface-hover hover:text-[var(--color-text)] ${isSearchActive ? 'text-gold-400' : ''}`}
        aria-label="Search"
      >
        <SearchIcon className="h-6 w-6" />
        <span className="text-xs">Search</span>
      </button>
      <button
        type="button"
        onClick={onRateClick}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-500 text-black shadow-lg transition-transform active:scale-95"
        aria-label="Rate a game"
      >
        <span className="text-xl font-bold">+</span>
      </button>
      <button
        type="button"
        onClick={onNotificationsClick}
        className={`flex flex-col items-center gap-0.5 rounded-full px-4 py-2 text-[var(--color-text-muted)] transition-colors hover:bg-surface-hover hover:text-[var(--color-text)] ${isNotificationsActive ? 'text-gold-400' : ''}`}
        aria-label="Notifications"
      >
        <BellIcon className="h-6 w-6" count={notificationUnreadCount} />
        <span className="text-xs">Notifications</span>
      </button>
      <button
        type="button"
        onClick={onMessagesClick}
        className={`flex flex-col items-center gap-0.5 rounded-full px-4 py-2 text-[var(--color-text-muted)] transition-colors hover:bg-surface-hover hover:text-[var(--color-text)] ${isMessagesActive ? 'text-gold-400' : ''}`}
        aria-label="Messages"
      >
        <MessageIcon className="h-6 w-6" />
        <span className="text-xs">Messages</span>
      </button>
    </nav>
  )
}
