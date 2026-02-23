import { useState } from 'react'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN = 10
const PASSWORD_MAX = 12
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/

export interface CreateAccountData {
  email: string
  password: string
}

interface CreateAccountFormProps {
  onSubmit: (data: CreateAccountData) => void | Promise<void>
  loading?: boolean
}

export function CreateAccountForm({ onSubmit, loading = false }: CreateAccountFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Please enter your email.')
      return
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
      setError(`Password must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters.`)
      return
    }
    if (!SPECIAL_CHAR_REGEX.test(password)) {
      setError('Password must include at least one special character.')
      return
    }
    await onSubmit({ email: trimmedEmail, password })
  }

  return (
    <div className="rounded-2xl border border-surface-border bg-surface-elevated p-6 pt-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div>
          <label
            htmlFor="create-account-email"
            className="mb-1 block text-sm font-medium text-[var(--color-text-muted)]"
          >
            Email
          </label>
          <input
            id="create-account-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full rounded-xl border border-surface-border bg-surface-hover px-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/50"
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Use a valid email address from a real email provider.
          </p>
        </div>

        <div>
          <label
            htmlFor="create-account-password"
            className="mb-1 block text-sm font-medium text-[var(--color-text-muted)]"
          >
            Password
          </label>
          <div className="flex gap-2">
            <input
              id="create-account-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`${PASSWORD_MIN}–${PASSWORD_MAX} characters, 1 special character`}
              autoComplete="new-password"
              minLength={PASSWORD_MIN}
              maxLength={PASSWORD_MAX}
              className="w-full rounded-xl border border-surface-border bg-surface-hover px-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="shrink-0 rounded-xl border border-surface-border bg-surface-hover px-3 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {PASSWORD_MIN}–{PASSWORD_MAX} characters, at least one special character (!@#$%^&* etc.)
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-gold-500 py-3.5 font-bold text-black transition-colors hover:bg-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-70"
        >
          {loading ? 'Sending…' : 'Create account'}
        </button>
      </form>
    </div>
  )
}
