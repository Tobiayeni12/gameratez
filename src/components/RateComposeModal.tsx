import { useEffect, useRef, useState } from 'react'
import { RateBubble } from './RateBubble'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  EmojiIcon,
  ImageIcon,
  PollIcon,
  ScheduleIcon,
  SearchIcon,
} from './icons'
import playstationXboxGamesData from '../data/playstationXboxGames2012_2026.json'
import { API_BASE } from '../lib/apiBase'

/** PlayStation and Xbox games (2012–2026). Only games in this list can be rated. */
const GAMES_LIST: string[] = Array.isArray(playstationXboxGamesData) ? playstationXboxGamesData : (playstationXboxGamesData as { default?: string[] }).default ?? []

/** Only games in this list can be rated. User must pick from search results—no free text. */
function isGameInList(gameName: string): boolean {
  return GAMES_LIST.some((g) => g === gameName)
}

export interface RateComposeModalProps {
  profile: { displayName: string }
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: { gameName: string; rating: number; body: string; images?: string[]; scheduledAt?: string | null }) => void
}

export function RateComposeModal({ profile, isOpen, onClose, onSubmit }: RateComposeModalProps) {
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState('')
  const [gameDropdownOpen, setGameDropdownOpen] = useState(false)
  const [gameSearchQuery, setGameSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const gameSearchInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduledAt, setScheduledAt] = useState<string | null>(null)

  const searchTrimmed = gameSearchQuery.trim()
  const searchLower = searchTrimmed.toLowerCase()
  const searchNormalized = searchLower.replace(/\s+/g, '')
  const filteredGames = GAMES_LIST.filter((game) => {
    const nameLower = game.toLowerCase()
    const nameNormalized = nameLower.replace(/\s+/g, '')
    return nameLower.includes(searchLower) || (searchNormalized.length > 0 && nameNormalized.includes(searchNormalized))
  })
  const hasSearchText = searchTrimmed.length > 0

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setGameDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, gameDropdownOpen])

  useEffect(() => {
    if (gameDropdownOpen) {
      setGameSearchQuery('')
      setTimeout(() => gameSearchInputRef.current?.focus(), 0)
    }
  }, [gameDropdownOpen])

  const canSubmit =
    selectedGame != null &&
    body.trim().length > 0 &&
    isGameInList(selectedGame)
  const ratingClamped = Math.min(10, Math.max(1, rating))

  function handleSubmit() {
    if (!selectedGame || !body.trim()) return
    if (!isGameInList(selectedGame)) return
    onSubmit({
      gameName: selectedGame,
      rating: ratingClamped,
      body: body.trim(),
      images: images.length ? images : undefined,
      scheduledAt,
    })
    setSelectedGame(null)
    setRating(5)
    setBody('')
    setImages([])
    setUploadError(null)
    setShowEmojiPicker(false)
    setScheduleOpen(false)
    setScheduledAt(null)
    onClose()
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    const remainingSlots = Math.max(0, 4 - images.length)
    if (remainingSlots <= 0) {
      setUploadError('You can attach up to 4 images.')
      return
    }
    const filesToUpload = Array.from(files).slice(0, remainingSlots)
    setUploadError(null)
    try {
      const uploaded: string[] = []
      for (const file of filesToUpload) {
        const formData = new FormData()
        formData.append('image', file)
        const res = await fetch(`${API_BASE}/api/upload-image`, {
          method: 'POST',
          body: formData,
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && typeof data.url === 'string') {
          uploaded.push(data.url)
        } else if (!res.ok) {
          throw new Error(data.error || 'Upload failed')
        }
      }
      if (uploaded.length) {
        setImages((prev) => [...prev, ...uploaded])
      }
    } catch (err) {
      setUploadError('Could not upload image(s).')
    } finally {
      if (e.target) e.target.value = ''
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-surface-border bg-surface-elevated p-4 shadow-2xl">
        <div className="flex gap-3">
          {/* Profile picture — current account */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-hover text-gold-400">
            <span className="text-lg font-semibold">
              {profile.displayName[0]?.toUpperCase() ?? '?'}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            {/* Game picker — see-through bubble */}
            <div className="relative mb-3" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setGameDropdownOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/40 bg-gold-500/10 px-3.5 py-1.5 text-sm font-medium text-gold-400 transition-colors hover:bg-gold-500/20"
              >
                <span>{selectedGame ?? 'Pick a game'}</span>
                <ChevronDownIcon className="h-4 w-4 shrink-0" />
              </button>
              {gameDropdownOpen && (
                <div className="absolute left-0 top-full z-10 mt-1 w-full min-w-[240px] max-w-[320px] overflow-hidden rounded-xl border border-surface-border bg-surface-elevated shadow-xl">
                  <div className="border-b border-surface-border p-2">
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
                      <input
                        ref={gameSearchInputRef}
                        type="text"
                        value={gameSearchQuery}
                        onChange={(e) => setGameSearchQuery(e.target.value)}
                        placeholder="Search games..."
                        className="w-full rounded-lg border border-surface-border bg-surface-hover py-2 pl-9 pr-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/50"
                      />
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto py-1">
                    {!hasSearchText ? (
                      <p className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                        Type to search the game list. You can only rate games that appear in the results.
                      </p>
                    ) : filteredGames.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                        Look out! We might be adding this soon!
                      </p>
                    ) : (
                      filteredGames.map((game) => (
                        <button
                          key={game}
                          type="button"
                          onClick={() => {
                            setSelectedGame(game)
                            setGameDropdownOpen(false)
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-[var(--color-text)] transition-colors hover:bg-surface-hover"
                        >
                          {game}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Rating row: left arrow — circle — right arrow */}
            <div className="mb-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRating((r) => Math.max(1, r - 1))}
                disabled={rating <= 1}
                className="rounded-full p-2 text-[var(--color-text-muted)] transition-colors hover:bg-gold-500/10 hover:text-gold-400 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--color-text-muted)]"
                aria-label="Decrease rating"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <RateBubble rating={ratingClamped} size="md" />
              <button
                type="button"
                onClick={() => setRating((r) => Math.min(10, r + 1))}
                disabled={rating >= 10}
                className="rounded-full p-2 text-[var(--color-text-muted)] transition-colors hover:bg-gold-500/10 hover:text-gold-400 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--color-text-muted)]"
                aria-label="Increase rating"
              >
                <ArrowRightIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Text area — Twitter "What's happening?" style */}
            <textarea
              placeholder="What's happening?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full resize-none border-0 bg-transparent text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-0"
              autoFocus
            />

            {/* Image previews */}
            {images.length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl border border-surface-border/70 bg-surface-hover/40 p-2">
                {images.map((url, index) => (
                  <div key={url} className="relative overflow-hidden rounded-xl">
                    <img
                      src={url}
                      alt={`Attachment ${index + 1}`}
                      className="h-40 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setImages((prev) => prev.filter((u) => u !== url))
                      }
                      className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-xs font-semibold text-white"
                      aria-label="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploadError && (
              <p className="mb-2 text-xs text-red-400">{uploadError}</p>
            )}

            {/* Reply line (Twitter-style) */}
            <p className="mb-3 flex items-center gap-1.5 text-sm text-gold-400">
              <span className="text-base">🌐</span>
              Everyone can reply
            </p>

            <div className="flex items-center justify-between border-t border-surface-border pt-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full p-2 text-[var(--color-text-muted)] transition-colors hover:bg-gold-500/10 hover:text-gold-400"
                  aria-label="Upload images"
                  title="Upload images"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((open) => !open)}
                  className={`rounded-full p-2 text-[var(--color-text-muted)] transition-colors hover:bg-gold-500/10 hover:text-gold-400 ${
                    showEmojiPicker ? 'bg-gold-500/10 text-gold-400' : ''
                  }`}
                  aria-label="Add emoji"
                  title="Emoji"
                >
                  <EmojiIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-full p-2 text-[var(--color-text-muted)] opacity-60"
                  aria-label="Polls coming soon"
                  title="Polls coming soon"
                >
                  <PollIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleOpen((open) => !open)}
                  className={`rounded-full p-2 text-[var(--color-text-muted)] transition-colors hover:bg-gold-500/10 hover:text-gold-400 ${
                    scheduleOpen ? 'bg-gold-500/10 text-gold-400' : ''
                  }`}
                  aria-label="Schedule rate"
                  title="Schedule"
                >
                  <ScheduleIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-4 py-2 font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-surface-hover hover:text-[var(--color-text)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="rounded-full bg-gold-500 px-5 py-2 font-bold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-50 hover:enabled:bg-gold-400"
                >
                  Rate
                </button>
              </div>
            </div>

            {showEmojiPicker && (
              <div className="mt-2 inline-flex flex-wrap gap-1 rounded-2xl border border-surface-border bg-surface-elevated px-3 py-2 text-xl">
                {['🎮', '🔥', '😍', '😂', '😢', '👍', '👎', '⭐', '🤯', '❤️'].map(
                  (emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="px-1"
                      onClick={() => {
                        setBody((prev) => prev + emoji)
                        setShowEmojiPicker(false)
                      }}
                    >
                      {emoji}
                    </button>
                  ),
                )}
              </div>
            )}

            {scheduleOpen && (
              <div className="mt-3 flex items-center justify-end gap-2 text-xs text-[var(--color-text-muted)]">
                <span>Schedule rate:</span>
                <input
                  type="datetime-local"
                  value={scheduledAt ?? ''}
                  onChange={(e) =>
                    setScheduledAt(e.target.value ? e.target.value : null)
                  }
                  className="rounded-md border border-surface-border bg-surface-hover px-2 py-1 text-xs text-[var(--color-text)] outline-none focus:border-gold-500/60"
                />
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageChange}
            />
          </div>
        </div>
      </div>
    </>
  )
}
