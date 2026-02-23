const STORAGE_KEY = 'gameratez_profile'

export interface UserProfile {
  id: string
  email: string
  displayName: string
  username: string
  bio: string
  favoriteGameKinds: string[]
  feedPreference: string
  createdAt: string
}

/** Normalize server profile so it always has full UserProfile shape (for save/load). */
export function normalizeProfile(profile: Partial<UserProfile> | null): UserProfile | null {
  if (!profile || !profile.id || !profile.displayName || !profile.username) return null
  return {
    id: profile.id,
    email: profile.email ?? '',
    displayName: profile.displayName,
    username: String(profile.username).trim().replace(/^@/, ''),
    bio: profile.bio ?? '',
    favoriteGameKinds: Array.isArray(profile.favoriteGameKinds) ? profile.favoriteGameKinds : [],
    feedPreference: typeof profile.feedPreference === 'string' ? profile.feedPreference : 'all',
    createdAt: profile.createdAt ?? new Date().toISOString(),
  }
}

/** Default profile used when none is saved (app shows main UI without Create Account gate). */
export function getDefaultProfile(): UserProfile {
  return {
    id: 'guest',
    email: '',
    displayName: 'Guest',
    username: 'guest',
    bio: '',
    favoriteGameKinds: [],
    feedPreference: 'all',
    createdAt: new Date().toISOString(),
  }
}

export function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as UserProfile
    if (!data.id || !data.displayName || !data.username) return null
    return normalizeProfile(data) ?? null
  } catch {
    return null
  }
}

export function saveProfile(profile: Omit<UserProfile, 'id' | 'createdAt'>): UserProfile {
  const withMeta: UserProfile = {
    ...profile,
    id: `profile-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(withMeta))
  return withMeta
}

export function updateProfile(profile: UserProfile | Partial<UserProfile>): UserProfile {
  const normalized = normalizeProfile(profile)
  if (!normalized) throw new Error('Invalid profile: id, displayName, and username required')
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}
