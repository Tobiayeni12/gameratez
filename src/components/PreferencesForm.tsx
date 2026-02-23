import { useState } from 'react'

const GAME_GENRES = [
  'Action',
  'Adventure',
  'RPG',
  'FPS',
  'Sports',
  'Racing',
  'Strategy',
  'Indie',
  'Horror',
  'Puzzle',
  'Fighting',
  'Simulation',
] as const

const FEED_OPTIONS = [
  { value: 'all', label: 'All game rates' },
  { value: 'favorites', label: 'Only my favorite genres' },
  { value: 'trending', label: 'Trending and popular rates' },
]

export interface PreferencesData {
  displayName: string
  username: string
  favoriteGameKinds: string[]
  feedPreference: string
  platform: 'ps' | 'xbox' | 'pc' | ''
}

interface PreferencesFormProps {
  onSubmit: (data: PreferencesData) => void
  initialDisplayName?: string
}

export function PreferencesForm({ onSubmit, initialDisplayName = '' }: PreferencesFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [username, setUsername] = useState('')
  const [favoriteGameKinds, setFavoriteGameKinds] = useState<string[]>([])
  const [feedPreference, setFeedPreference] = useState('all')
  const [platform, setPlatform] = useState<'ps' | 'xbox' | 'pc' | ''>('')
  const [error, setError] = useState('')

  function toggleGenre(genre: string) {
    setFavoriteGameKinds((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const handle = username.trim().replace(/^@/, '')
    if (!displayName.trim()) {
      setError('Display name is required.')
      return
    }
    if (!handle) {
      setError('Username is required.')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(handle)) {
      setError('Username can only contain letters, numbers, and underscores.')
      return
    }
    onSubmit({
      displayName: displayName.trim(),
      username: handle,
      favoriteGameKinds,
      feedPreference,
      platform,
    })
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-elevated p-6">
      <h2 className="mb-1 text-xl font-bold text-[var(--color-text)]">
        Almost there
      </h2>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Tell us your favorite kinds of games and how you’d like your feed.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-muted)]">
            Display name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How you want to be called"
            maxLength={50}
            className="w-full rounded-xl border border-surface-border bg-surface-hover px-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/50"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--color-text-muted)]">
            Primary platform
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ps', label: 'PlayStation', badge: 'PS' },
              { id: 'xbox', label: 'Xbox', badge: 'Xbox' },
              { id: 'pc', label: 'PC', badge: 'PC' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPlatform(opt.id as 'ps' | 'xbox' | 'pc')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  platform === opt.id
                    ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]'
                    : 'bg-surface-hover text-[var(--color-text-muted)] hover:bg-surface-border hover:text-[var(--color-text)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            This will show on your profile and rates.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-muted)]">
            Username
          </label>
          <div className="flex items-center rounded-xl border border-surface-border bg-surface-hover focus-within:border-gold-500/50 focus-within:ring-1 focus-within:ring-gold-500/50">
            <span className="pl-4 text-[var(--color-text-muted)]">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
              placeholder="username"
              maxLength={30}
              className="w-full bg-transparent py-3 pr-4 pl-1 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--color-text-muted)]">
            Favorite kinds of games
          </label>
          <div className="flex flex-wrap gap-2">
            {GAME_GENRES.map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  favoriteGameKinds.includes(genre)
                    ? 'bg-gold-500/20 text-gold-400 ring-1 ring-gold-500/50'
                    : 'bg-surface-hover text-[var(--color-text-muted)] hover:bg-surface-border hover:text-[var(--color-text)]'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--color-text-muted)]">
            What would you like to see on your feed?
          </label>
          <div className="flex flex-col gap-2">
            {FEED_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-surface-border bg-surface-hover px-4 py-3 transition-colors has-[:checked]:border-gold-500/50 has-[:checked]:ring-1 has-[:checked]:ring-gold-500/50"
              >
                <input
                  type="radio"
                  name="feedPreference"
                  value={opt.value}
                  checked={feedPreference === opt.value}
                  onChange={() => setFeedPreference(opt.value)}
                  className="h-4 w-4 border-surface-border text-gold-500 focus:ring-gold-500"
                />
                <span className="text-[var(--color-text)]">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="mt-2 rounded-full bg-gold-500 py-3.5 font-bold text-black transition-colors hover:bg-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-surface"
        >
          Continue
        </button>
      </form>
    </div>
  )
}
