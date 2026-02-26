import { useState, useEffect, useRef } from 'react'
import { MoreIcon, SearchIcon } from './icons'

interface MobileHeaderProps {
  /** called when user selects "Sign out" from menu */
  onSignOut?: () => void
  /** optional search button handler shown on left */
  onSearchClick?: () => void
}

export function MobileHeader({ onSignOut, onSearchClick }: MobileHeaderProps) {
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
    <header className="sticky top-0 z-20 flex h-14 items-center justify-center border-b border-surface-border/70 bg-surface/80 backdrop-blur-xl md:hidden">
      {onSearchClick && (
        <button
          type="button"
          onClick={onSearchClick}
          className="absolute left-3 rounded-full p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-gold-500/10 hover:text-gold-400"
          aria-label="Search"
        >
          <SearchIcon className="h-5 w-5" />
        </button>
      )}
      <img
        src="/gameratez-logo.png"
        alt="Gameratez"
        className="h-14 w-auto max-w-[260px] object-contain"
      />
      {onSignOut && (
        <div className="absolute right-3" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-full p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-gold-500/10 hover:text-gold-400"
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <MoreIcon className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-max min-w-[160px] z-50 overflow-hidden rounded-2xl bg-surface-elevated py-1 shadow-xl ring-1 ring-surface-border">
              <button
                type="button"
                className="block w-full px-4 py-3 text-left text-[15px] text-[var(--color-text)] transition-colors hover:bg-surface-hover"
                onClick={() => {
                  setMenuOpen(false)
                  onSignOut!()
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
