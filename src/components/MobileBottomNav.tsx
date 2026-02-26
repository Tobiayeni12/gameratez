import { BellIcon, HomeIcon, MessageIcon, UserIcon } from './icons'

interface MobileBottomNavProps {
  onHomeClick: () => void
  onRateClick: () => void
  onNotificationsClick: () => void
  onMessagesClick: () => void
  onProfileClick?: () => void
  isHomeActive?: boolean
  isSearchActive?: boolean
  isNotificationsActive?: boolean
  isMessagesActive?: boolean
  notificationUnreadCount?: number
}

export function MobileBottomNav({
  onHomeClick,
  onRateClick,
  onNotificationsClick,
  onMessagesClick,
  onProfileClick,
  isHomeActive = false,
  isNotificationsActive = false,
  isMessagesActive = false,
  notificationUnreadCount = 0,
}: MobileBottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-surface-border/70 bg-surface/90 backdrop-blur-xl py-2 md:hidden"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <button
        type="button"
        onClick={onHomeClick}
        className={`flex flex-col items-center gap-0.5 rounded-full px-4 py-2 text-[var(--color-text-muted)] transition-colors hover:bg-surface-hover hover:text-[var(--color-text)] ${
          isHomeActive ? 'text-gold-400' : ''
        }`}
        aria-label="Home"
      >
        <HomeIcon className="h-6 w-6" />
        <span className="text-xs">Home</span>
      </button>
      {/* central rate button floats above the bar */}
      <button
        type="button"
        onClick={onRateClick}
        className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-gold-500 via-gold-400 to-[var(--color-accent)] text-black shadow-gold-glow transition-transform active:scale-95"
        aria-label="Rate a game"
      >
        <span className="text-2xl font-bold">+</span>
      </button>
      <button
        type="button"
        onClick={onNotificationsClick}
        className={`flex flex-col items-center gap-0.5 rounded-full px-4 py-2 text-[var(--color-text-muted)] transition-colors hover:bg-surface-hover hover:text-[var(--color-text)] ${
          isNotificationsActive ? 'text-gold-400' : ''
        }`}
        aria-label="Notifications"
      >
        <BellIcon className="h-6 w-6" count={notificationUnreadCount} />
        <span className="text-xs">Notifications</span>
      </button>
      <button
        type="button"
        onClick={onMessagesClick}
        className={`flex flex-col items-center gap-0.5 rounded-full px-4 py-2 text-[var(--color-text-muted)] transition-colors hover:bg-surface-hover hover:text-[var(--color-text)] ${
          isMessagesActive ? 'text-gold-400' : ''
        }`}
        aria-label="Messages"
      >
        <MessageIcon className="h-6 w-6" />
        <span className="text-xs">Messages</span>
      </button>
      {onProfileClick && (
        <button
          type="button"
          onClick={onProfileClick}
          className="flex flex-col items-center gap-0.5 rounded-full px-4 py-2 text-[var(--color-text-muted)] transition-colors hover:bg-surface-hover hover:text-[var(--color-text)]"
          aria-label="Profile"
        >
          <UserIcon className="h-6 w-6" />
          <span className="text-xs">Profile</span>
        </button>
      )}
    </nav>
  )
}
