import { useState } from 'react'

export interface ProfileFormData {
  displayName: string
  username: string
  bio: string
  platform: 'ps' | 'xbox' | 'pc' | ''
}

interface CreateProfileFormProps {
  onSubmit: (data: ProfileFormData) => void
  initialDisplayName?: string
  initialUsername?: string
  initialBio?: string
  /** When true, hide title and description (e.g. for entry gate) */
  minimal?: boolean
  initialPlatform?: 'ps' | 'xbox' | 'pc' | ''
}

export function CreateProfileForm({
  onSubmit,
  initialDisplayName = '',
  initialUsername = '',
  initialBio = '',
  minimal = false,
  initialPlatform = '',
}: CreateProfileFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [username, setUsername] = useState(initialUsername)
  const [bio, setBio] = useState(initialBio)
  const [platform, setPlatform] = useState<'ps' | 'xbox' | 'pc' | ''>(initialPlatform)
  const [error, setError] = useState('')

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
      bio: bio.trim(),
      platform,
    })
  }

  return (
    <div className={`rounded-2xl border border-surface-border bg-surface-elevated p-6 ${minimal ? 'pt-4' : ''}`}>
      {!minimal && (
        <>
          <h2 className="mb-1 text-xl font-bold text-[var(--color-text)]">
            Create your profile
          </h2>
          <p className="mb-6 text-sm text-[var(--color-text-muted)]">
            This will be stored and shown on your rates.
          </p>
        </>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div>
          <label
            htmlFor="displayName"
            className="mb-1 block text-sm font-medium text-[var(--color-text-muted)]"
          >
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How you want to be called"
            maxLength={50}
            className="w-full rounded-xl border border-surface-border bg-surface-hover px-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/50"
          />
        </div>

        <div>
          <label
            htmlFor="username"
            className="mb-1 block text-sm font-medium text-[var(--color-text-muted)]"
          >
            Username
          </label>
          <div className="flex items-center rounded-xl border border-surface-border bg-surface-hover focus-within:border-gold-500/50 focus-within:ring-1 focus-within:ring-gold-500/50">
            <span className="pl-4 text-[var(--color-text-muted)]">@</span>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
              placeholder="username"
              maxLength={30}
              className="w-full bg-transparent py-3 pr-4 pl-1 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            />
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Letters, numbers, and underscores only.
          </p>
        </div>

        <div>
          <label
            htmlFor="bio"
            className="mb-1 block text-sm font-medium text-[var(--color-text-muted)]"
          >
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short bio about you and the games you love..."
            rows={4}
            maxLength={160}
            className="w-full resize-none rounded-xl border border-surface-border bg-surface-hover px-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/50"
          />
          <p className="mt-1 text-right text-xs text-[var(--color-text-muted)]">
            {bio.length}/160
          </p>
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-[var(--color-text-muted)]"
          >
            Primary platform
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ps', label: 'PlayStation' },
              { id: 'xbox', label: 'Xbox' },
              { id: 'pc', label: 'PC' },
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
        </div>

        <button
          type="submit"
          className="mt-2 rounded-full bg-gold-500 py-3.5 font-bold text-black transition-colors hover:bg-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-surface"
        >
          Save profile
        </button>
      </form>
    </div>
  )
}
