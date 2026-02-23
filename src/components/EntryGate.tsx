import { useState } from 'react'
import { CreateAccountForm, type CreateAccountData } from './CreateAccountForm'
import { PreferencesForm } from './PreferencesForm'
import type { UserProfile } from '../lib/profileStorage'
import { normalizeProfile, saveProfile, updateProfile } from '../lib/profileStorage'

const API = '/api'

interface EntryGateProps {
  onProfileCreated: (profile: UserProfile) => void
}

type Step = 'buttons' | 'createAccount' | 'preferences' | 'signIn'

export function EntryGate({ onProfileCreated }: EntryGateProps) {
  return (
    <div className="flex min-h-screen flex-col bg-surface md:flex-row">
      {/* Left: logo */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 md:py-0">
        <img
          src="/gameratez-logo.png"
          alt="Gameratez"
          className="h-72 w-auto max-w-[960px] object-contain md:h-96 md:max-w-[1200px]"
        />
      </div>

      {/* Right: buttons or form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 md:items-start md:py-0 md:pr-16 md:pl-0">
        <EntryGateContent onProfileCreated={onProfileCreated} />
      </div>
    </div>
  )
}

function EntryGateContent({ onProfileCreated }: EntryGateProps) {
  const [step, setStep] = useState<Step>('buttons')
  const [email, setEmail] = useState('')
  const [completeToken, setCompleteToken] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [signupLoading, setSignupLoading] = useState(false)
  const [signInLoading, setSignInLoading] = useState(false)

  if (step === 'createAccount') {
    return (
      <div className="w-full max-w-sm">
        {apiError && (
          <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {apiError}
          </p>
        )}
        <CreateAccountForm
          loading={signupLoading}
          onSubmit={async (data: CreateAccountData) => {
            setApiError(null)
            setSignupLoading(true)
            try {
              const res = await fetch(`${API}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: data.email, password: data.password }),
              })
              const json = await res.json().catch(() => ({}))
              if (!res.ok) {
                const msg = json.error || (res.status === 502 || res.status === 504
                  ? 'Server not running. Start it with: npm run dev'
                  : 'Sign up failed')
                setApiError(json.details ? `${msg}: ${json.details}` : msg)
                return
              }
              setEmail(json.email ?? data.email)
              setCompleteToken(json.completeToken ?? null)
              setStep('preferences')
            } catch {
              setApiError('Could not reach server. Run "npm run dev" to start the app and API server.')
            } finally {
              setSignupLoading(false)
            }
          }}
        />
      </div>
    )
  }

  if (step === 'preferences') {
    return (
      <div className="w-full max-w-md">
        {apiError && (
          <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {apiError}
          </p>
        )}
        <PreferencesForm
          initialDisplayName=""
          onSubmit={async (data) => {
            setApiError(null)
            if (completeToken) {
              const res = await fetch(`${API}/auth/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  completeToken,
                  displayName: data.displayName,
                  username: data.username,
                  favoriteGameKinds: data.favoriteGameKinds,
                  feedPreference: data.feedPreference,
                }),
              })
              const json = await res.json().catch(() => ({}))
              if (!res.ok) {
                setApiError(json.error || 'Could not complete signup')
                return
              }
              const normalized = normalizeProfile(json.profile)
              if (normalized) {
                updateProfile(normalized)
                onProfileCreated(normalized)
              }
              return
            }
            const saved = saveProfile({
              email,
              displayName: data.displayName,
              username: data.username,
              bio: '',
              favoriteGameKinds: data.favoriteGameKinds,
              feedPreference: data.feedPreference,
            })
            onProfileCreated(saved)
          }}
        />
      </div>
    )
  }

  if (step === 'signIn') {
    return (
      <div className="w-full max-w-sm">
        {apiError && (
          <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {apiError}
          </p>
        )}
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            const form = e.currentTarget
            const emailInput = form.querySelector<HTMLInputElement>('input[name="email"]')
            const passwordInput = form.querySelector<HTMLInputElement>('input[name="password"]')
            const email = emailInput?.value?.trim() ?? ''
            const password = passwordInput?.value ?? ''
            if (!email || !password) {
              setApiError('Enter your email and password.')
              return
            }
            setApiError(null)
            setSignInLoading(true)
            try {
              const res = await fetch(`${API}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
              })
              const data = await res.json().catch(() => ({}))
              if (!res.ok) {
                setApiError(data.error || 'Sign in failed')
                return
              }
              if (data.profile) {
                const normalized = normalizeProfile(data.profile)
                if (normalized) {
                  updateProfile(normalized)
                  onProfileCreated(normalized)
                }
              }
            } catch {
              setApiError('Could not reach server.')
            } finally {
              setSignInLoading(false)
            }
          }}
        >
          <div>
            <label htmlFor="signin-email" className="mb-1 block text-sm font-medium text-[var(--color-text-muted)]">Email</label>
            <input
              id="signin-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-lg border border-[var(--color-text-muted)]/30 bg-black/40 px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-gold-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="signin-password" className="mb-1 block text-sm font-medium text-[var(--color-text-muted)]">Password</label>
            <input
              id="signin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              className="w-full rounded-lg border border-[var(--color-text-muted)]/30 bg-black/40 px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-gold-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={signInLoading}
            className="w-full rounded-full bg-gold-500 py-3 font-bold text-black transition-all hover:bg-gold-500/90 disabled:opacity-60"
          >
            {signInLoading ? 'Signing in…' : 'Sign in'}
          </button>
          <button
            type="button"
            onClick={() => { setApiError(null); setStep('buttons') }}
            className="text-sm text-[var(--color-text-muted)] underline hover:text-[var(--color-text)]"
          >
            Back
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4 text-[var(--color-text)]">
      <button
        type="button"
        onClick={() => setStep('createAccount')}
        className="w-full rounded-full border-2 border-transparent bg-gold-500 py-3 font-bold text-black transition-all hover:scale-[1.02] hover:border-gold-400 hover:bg-gold-500/90 hover:shadow-[0_0_24px_rgba(234,179,8,0.4)]"
      >
        Create Account
      </button>
      <div className="flex w-full items-center gap-3">
        <span className="flex-1 border-t border-[var(--color-text-muted)]" aria-hidden />
        <span className="shrink-0 text-sm italic text-[var(--color-text-muted)]">
          If you are a rater
        </span>
        <span className="flex-1 border-t border-[var(--color-text-muted)]" aria-hidden />
      </div>
      <button
        type="button"
        onClick={() => { setApiError(null); setStep('signIn') }}
        className="w-full rounded-full border-2 border-white bg-white py-3 font-semibold text-black transition-all hover:scale-[1.02] hover:bg-white/90 hover:shadow-[0_0_24px_rgba(234,179,8,0.35)]"
      >
        Sign in
      </button>
      <button
        type="button"
        className="w-full rounded-full border-2 border-white bg-white py-3 font-semibold text-black transition-all hover:scale-[1.02] hover:bg-white/90 hover:shadow-[0_0_24px_rgba(234,179,8,0.35)]"
      >
        Forgot password
      </button>
    </div>
  )
}
