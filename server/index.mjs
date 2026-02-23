import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import dns from 'dns'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import nodemailer from 'nodemailer'
import multer from 'multer'
import { Resend } from 'resend'
import crypto from 'crypto'

const dnsPromises = dns.promises

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const UPLOADS_DIR = path.join(__dirname, 'uploads')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const RATES_FILE = path.join(DATA_DIR, 'rates.json')
const FOLLOWS_FILE = path.join(DATA_DIR, 'follows.json')
const LIKES_FILE = path.join(DATA_DIR, 'likes.json')
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json')
const BOOKMARKS_FILE = path.join(DATA_DIR, 'bookmarks.json')
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json')

const app = express()
app.use(cors({ origin: true }))
app.use(express.json())

// Static files for uploaded images
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}
app.use('/uploads', express.static(UPLOADS_DIR))

// Multer for image uploads
const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 5 * 1024 * 1024, files: 4 }, // 5MB per image, up to 4
})

const PORT = process.env.PORT || 3001
const SITE_URL = process.env.SITE_URL || 'http://localhost:5173'

// Email: Gmail (free, no domain) or Resend (needs domain for "any recipient")
const GMAIL_USER = process.env.GMAIL_USER
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'Gameratez <onboarding@resend.dev>'

const gmailTransporter =
  GMAIL_USER && GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      })
    : null
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

// In-memory stores; users are persisted to data/users.json, rates to data/rates.json
const completeTokens = new Map()  // completeToken -> { email, passwordHash, expiresAt }
const users = new Map()           // email -> { email, passwordHash, displayName, username, ... }
let rates = []                    // array of rate objects, newest first
let follows = []                  // array of { followerUsername, followeeUsername }
let likes = []                    // array of { rateId, username }
let comments = []                 // array of { id, rateId, username, displayName, body, createdAt }
let notifications = []            // array of { id, type, createdAt, read, forUsername, actorUsername, actorDisplayName?, rateId?, gameName?, body? }
let bookmarks = []               // array of { rateId, username }
let messages = []                // array of { id, senderUsername, receiverUsername, body, createdAt }

function loadUsers() {
  try {
    if (!fs.existsSync(DATA_DIR)) return
    const raw = fs.readFileSync(USERS_FILE, 'utf8')
    const obj = JSON.parse(raw)
    if (obj && typeof obj === 'object') {
      for (const [email, user] of Object.entries(obj)) {
        if (user && typeof user.email === 'string') users.set(email, user)
      }
    }
  } catch (err) {
    console.warn('Could not load users from file:', err.message)
  }
}

function saveUsers() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    const obj = Object.fromEntries(users)
    fs.writeFileSync(USERS_FILE, JSON.stringify(obj, null, 2), 'utf8')
  } catch (err) {
    console.error('Could not save users:', err.message)
  }
}

loadUsers()

function loadRates() {
  try {
    if (!fs.existsSync(RATES_FILE)) return
    const raw = fs.readFileSync(RATES_FILE, 'utf8')
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) rates = arr
  } catch (err) {
    console.warn('Could not load rates from file:', err.message)
  }
}

function saveRates() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(RATES_FILE, JSON.stringify(rates, null, 2), 'utf8')
  } catch (err) {
    console.error('Could not save rates:', err.message)
  }
}

loadRates()

function loadFollows() {
  try {
    if (!fs.existsSync(FOLLOWS_FILE)) return
    const raw = fs.readFileSync(FOLLOWS_FILE, 'utf8')
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) follows = arr
  } catch (err) {
    console.warn('Could not load follows from file:', err.message)
  }
}

function saveFollows() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(FOLLOWS_FILE, JSON.stringify(follows, null, 2), 'utf8')
  } catch (err) {
    console.error('Could not save follows:', err.message)
  }
}

loadFollows()

function loadLikes() {
  try {
    if (!fs.existsSync(LIKES_FILE)) return
    const raw = fs.readFileSync(LIKES_FILE, 'utf8')
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) likes = arr
  } catch (err) {
    console.warn('Could not load likes from file:', err.message)
  }
}

function saveLikes() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(LIKES_FILE, JSON.stringify(likes, null, 2), 'utf8')
  } catch (err) {
    console.error('Could not save likes:', err.message)
  }
}

loadLikes()

function loadNotifications() {
  try {
    if (!fs.existsSync(NOTIFICATIONS_FILE)) return
    const raw = fs.readFileSync(NOTIFICATIONS_FILE, 'utf8')
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) notifications = arr
  } catch (err) {
    console.warn('Could not load notifications from file:', err.message)
  }
}

function saveNotifications() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2), 'utf8')
  } catch (err) {
    console.error('Could not save notifications:', err.message)
  }
}

loadNotifications()

function loadBookmarks() {
  try {
    if (!fs.existsSync(BOOKMARKS_FILE)) return
    const raw = fs.readFileSync(BOOKMARKS_FILE, 'utf8')
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) bookmarks = arr
  } catch (err) {
    console.warn('Could not load bookmarks from file:', err.message)
  }
}

function saveBookmarks() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(bookmarks, null, 2), 'utf8')
  } catch (err) {
    console.error('Could not save bookmarks:', err.message)
  }
}

loadBookmarks()

function loadMessages() {
  try {
    if (!fs.existsSync(MESSAGES_FILE)) return
    const raw = fs.readFileSync(MESSAGES_FILE, 'utf8')
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) messages = arr
  } catch (err) {
    console.warn('Could not load messages from file:', err.message)
  }
}

function saveMessages() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8')
  } catch (err) {
    console.error('Could not save messages:', err.message)
  }
}

loadMessages()

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

// Check that the email domain can receive mail (has MX records)
async function isRealEmailDomain(email) {
  const match = /@([^@]+)$/.exec(email)
  const domain = match ? match[1].trim().toLowerCase() : ''
  if (!domain) return false
  try {
    const mx = await dns.promises.resolveMx(domain)
    return Array.isArray(mx) && mx.length > 0
  } catch {
    return false
  }
}

// POST /api/auth/signup – no verification email; validate real email then go to preferences
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password required' })
    }
    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' })
    }
    const hasRealDomain = await isRealEmailDomain(normalizedEmail)
    if (!hasRealDomain) {
      return res.status(400).json({ error: 'Please use an email address from a real email provider (this domain does not accept email).' })
    }
    if (users.has(normalizedEmail)) {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }

    const completeToken = generateToken()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes
    completeTokens.set(completeToken, {
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      expiresAt,
    })

    res.json({ success: true, email: normalizedEmail, completeToken })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/complete
app.post('/api/auth/complete', (req, res) => {
  try {
    const { completeToken, displayName, username, favoriteGameKinds, feedPreference } = req.body
    if (!completeToken || !displayName || !username) {
      return res.status(400).json({ error: 'completeToken, displayName, and username required' })
    }

    const data = completeTokens.get(completeToken)
    if (!data) {
      return res.status(400).json({ error: 'Invalid or expired session' })
    }
    if (Date.now() > data.expiresAt) {
      completeTokens.delete(completeToken)
      return res.status(400).json({ error: 'Session expired. Please start again.' })
    }

    const user = users.get(data.email)
    if (user) {
      completeTokens.delete(completeToken)
      return res.status(409).json({ error: 'Account already completed' })
    }

    const handle = String(username).trim().replace(/^@/, '')
    const profile = {
      id: `profile-${Date.now()}`,
      email: data.email,
      displayName: String(displayName).trim(),
      username: handle,
      bio: '',
      favoriteGameKinds: Array.isArray(favoriteGameKinds) ? favoriteGameKinds : [],
      feedPreference: typeof feedPreference === 'string' ? feedPreference : 'all',
      createdAt: new Date().toISOString(),
    }
    users.set(data.email, { ...profile, passwordHash: data.passwordHash ?? null })
    completeTokens.delete(completeToken)
    saveUsers()

    res.json({ success: true, profile })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

function profileWithoutPassword(user) {
  if (!user) return null
  const { passwordHash, ...profile } = user
  return profile
}

// POST /api/auth/login – sign in with email + password (for existing accounts)
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password required' })
    }
    const normalizedEmail = email.trim().toLowerCase()
    const user = users.get(normalizedEmail)
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    if (!user.passwordHash) {
      return res.status(400).json({ error: 'This account uses Google sign-in. Use Continue with Google.' })
    }
    const hash = hashPassword(password)
    if (hash !== user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    res.json({ success: true, profile: profileWithoutPassword(user) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

function enrichRatesWithLikes(ratesArray, currentUsername) {
  const u = currentUsername ? String(currentUsername).trim().toLowerCase() : null
  return ratesArray.map((r) => {
    const rateId = r.id
    const likeCount = likes.filter((l) => l.rateId === rateId).length
    const liked = u ? likes.some((l) => l.rateId === rateId && (l.username || '').toLowerCase() === u) : false
    const commentCount = comments.filter((c) => c.rateId === rateId).length
    const bookmarkCount = bookmarks.filter((b) => b.rateId === rateId).length
    const bookmarked = u ? bookmarks.some((b) => b.rateId === rateId && (b.username || '').toLowerCase() === u) : false
    return { ...r, likeCount, liked, commentCount, bookmarkCount, bookmarked }
  })
}

// GET /api/rates – list rates; ?tab=following&username=xxx or ?raterHandle=xxx or ?bookmarkedBy=xxx
app.get('/api/rates', (req, res) => {
  try {
    const { tab, username, raterHandle, bookmarkedBy } = req.query
    const now = Date.now()
    let list
    if (tab === 'following' && username && typeof username === 'string') {
      const u = username.trim().toLowerCase()
      const followingSet = new Set(
        follows
          .filter((f) => (f.followerUsername || '').toLowerCase() === u)
          .map((f) => (f.followeeUsername || '').toLowerCase())
      )
      list = rates.filter((r) => followingSet.has((r.raterHandle || '').toLowerCase()))
    } else if (bookmarkedBy && typeof bookmarkedBy === 'string') {
      const u = bookmarkedBy.trim().toLowerCase()
      const rateIds = new Set(bookmarks.filter((b) => (b.username || '').toLowerCase() === u).map((b) => b.rateId))
      list = rates.filter((r) => rateIds.has(r.id))
    } else if (raterHandle && typeof raterHandle === 'string') {
      const u = raterHandle.trim().toLowerCase()
      list = rates.filter((r) => (r.raterHandle || '').toLowerCase() === u)
    } else {
      list = rates
    }
    // Hide rates scheduled for the future (createdAt in the future)
    list = list.filter((r) => {
      const t = new Date(r.createdAt || 0).getTime()
      return !Number.isNaN(t) && t <= now
    })
    res.json(enrichRatesWithLikes(list, username || bookmarkedBy))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/rates/:id?username=xxx – single rate by id (enriched)
app.get('/api/rates/:id', (req, res) => {
  try {
    const id = req.params.id
    const username = req.query.username
    const rate = rates.find((r) => r.id === id)
    if (!rate) return res.status(404).json({ error: 'Rate not found' })
    const created = new Date(rate.createdAt || 0).getTime()
    if (Number.isNaN(created) || created > Date.now()) {
      return res.status(404).json({ error: 'Rate not found' })
    }
    const list = enrichRatesWithLikes([rate], username)
    res.json(list[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/search?q=xxx – search people (users) and rates
app.get('/api/search', (req, res) => {
  try {
    const q = (req.query.q && String(req.query.q).trim()) || ''
    const qLower = q.toLowerCase()
    const usersList = []
    if (q.length >= 1) {
      for (const user of users.values()) {
        const u = user && typeof user === 'object' ? user : null
        if (!u) continue
        const username = (u.username || '').toLowerCase()
        const displayName = (u.displayName || '').toLowerCase()
        if (username.includes(qLower) || displayName.includes(qLower)) {
          usersList.push({ username: (u.username || '').trim(), displayName: (u.displayName || '').trim() })
        }
      }
      const now = Date.now()
      const ratesList = rates.filter((r) => {
        const created = new Date(r.createdAt || 0).getTime()
        if (Number.isNaN(created) || created > now) return false
        const game = (r.gameName || '').toLowerCase()
        const body = (r.body || '').toLowerCase()
        const handle = (r.raterHandle || '').toLowerCase()
        return game.includes(qLower) || body.includes(qLower) || handle.includes(qLower)
      })
      const enriched = enrichRatesWithLikes(ratesList.slice(0, 50), null)
      return res.json({ users: usersList.slice(0, 20), rates: enriched })
    }
    res.json({ users: [], rates: [] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/rates/trending – top 5 games by rate count (1st to 5th)
app.get('/api/rates/trending', (req, res) => {
  try {
    const byGame = new Map() // key: lowercase game name, value: { count, displayName } (displayName from first seen)
    const now = Date.now()
    for (const r of rates) {
      const created = new Date(r.createdAt || 0).getTime()
      if (Number.isNaN(created) || created > now) continue
      const name = (r.gameName || '').trim()
      const key = name.toLowerCase()
      if (!key) continue
      const cur = byGame.get(key)
      if (!cur) byGame.set(key, { count: 1, displayName: name })
      else cur.count += 1
    }
    const sorted = [...byGame.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([_, v], i) => ({ rank: i + 1, gameName: v.displayName, count: v.count }))
    res.json(sorted)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/users/profile?username=xxx – public profile (displayName, username) for viewing another user
app.get('/api/users/profile', (req, res) => {
  try {
    const username = req.query.username
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'username required' })
    }
    const u = username.trim().toLowerCase()
    for (const user of users.values()) {
      if (user && (user.username || '').toLowerCase() === u) {
        return res.json({ username: (user.username || '').trim(), displayName: (user.displayName || '').trim() })
      }
    }
    res.status(404).json({ error: 'User not found' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/following?username=xxx – list usernames that xxx follows
app.get('/api/following', (req, res) => {
  try {
    const username = req.query.username
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'username required' })
    }
    const u = username.trim().toLowerCase()
    const list = follows
      .filter((f) => (f.followerUsername || '').toLowerCase() === u)
      .map((f) => f.followeeUsername)
    res.json(list)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/follow – { followerUsername, followeeUsername }
app.post('/api/follow', (req, res) => {
  try {
    const { followerUsername, followeeUsername } = req.body
    const follower = String(followerUsername ?? '').trim().toLowerCase()
    const followee = String(followeeUsername ?? '').trim().toLowerCase()
    if (!follower || !followee) {
      return res.status(400).json({ error: 'followerUsername and followeeUsername required' })
    }
    if (follower === followee) {
      return res.status(400).json({ error: 'Cannot follow yourself' })
    }
    if (follows.some((f) => (f.followerUsername || '').toLowerCase() === follower && (f.followeeUsername || '').toLowerCase() === followee)) {
      return res.status(409).json({ error: 'Already following' })
    }
    follows.push({ followerUsername: follower, followeeUsername: followee })
    saveFollows()
    notifications.unshift({
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: 'follow',
      createdAt: new Date().toISOString(),
      read: false,
      forUsername: followee,
      actorUsername: follower,
    })
    saveNotifications()
    res.status(201).json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/follow – body: { followerUsername, followeeUsername }
app.delete('/api/follow', (req, res) => {
  try {
    const { followerUsername, followeeUsername } = req.body
    const follower = String(followerUsername ?? '').trim().toLowerCase()
    const followee = String(followeeUsername ?? '').trim().toLowerCase()
    if (!follower || !followee) {
      return res.status(400).json({ error: 'followerUsername and followeeUsername required' })
    }
    const before = follows.length
    follows = follows.filter(
      (f) => !((f.followerUsername || '').toLowerCase() === follower && (f.followeeUsername || '').toLowerCase() === followee)
    )
    if (follows.length === before) {
      return res.status(404).json({ error: 'Not following' })
    }
    saveFollows()
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/rates/:id/like – body { username }
app.post('/api/rates/:id/like', (req, res) => {
  try {
    const rateId = req.params.id
    const { username } = req.body
    const u = username != null ? String(username).trim().toLowerCase() : ''
    if (!u) return res.status(400).json({ error: 'username required' })
    if (!rates.some((r) => r.id === rateId)) return res.status(404).json({ error: 'Rate not found' })
    if (likes.some((l) => l.rateId === rateId && (l.username || '').toLowerCase() === u)) {
      const likeCount = likes.filter((l) => l.rateId === rateId).length
      return res.status(409).json({ error: 'Already liked', likeCount })
    }
    likes.push({ rateId, username: u })
    saveLikes()
    const rate = rates.find((r) => r.id === rateId)
    const ownerHandle = rate ? (rate.raterHandle || '').trim().toLowerCase() : ''
    if (ownerHandle && ownerHandle !== u) {
      notifications.unshift({
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: 'like',
        createdAt: new Date().toISOString(),
        read: false,
        forUsername: ownerHandle,
        actorUsername: u,
        rateId,
        gameName: rate.gameName || '',
      })
      saveNotifications()
    }
    const likeCount = likes.filter((l) => l.rateId === rateId).length
    res.status(201).json({ success: true, likeCount })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/rates/:id/like – body { username }
app.delete('/api/rates/:id/like', (req, res) => {
  try {
    const rateId = req.params.id
    const { username } = req.body
    const u = username != null ? String(username).trim().toLowerCase() : ''
    if (!u) return res.status(400).json({ error: 'username required' })
    const before = likes.length
    likes = likes.filter((l) => !(l.rateId === rateId && (l.username || '').toLowerCase() === u))
    if (likes.length === before) return res.status(404).json({ error: 'Not liked' })
    saveLikes()
    const likeCount = likes.filter((l) => l.rateId === rateId).length
    res.json({ success: true, likeCount })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/rates/:id/bookmark – body { username }
app.post('/api/rates/:id/bookmark', (req, res) => {
  try {
    const rateId = req.params.id
    const { username } = req.body
    const u = username != null ? String(username).trim().toLowerCase() : ''
    if (!u) return res.status(400).json({ error: 'username required' })
    if (!rates.some((r) => r.id === rateId)) return res.status(404).json({ error: 'Rate not found' })
    if (bookmarks.some((b) => b.rateId === rateId && (b.username || '').toLowerCase() === u)) {
      const bookmarkCount = bookmarks.filter((b) => b.rateId === rateId).length
      return res.status(409).json({ error: 'Already bookmarked', bookmarkCount })
    }
    bookmarks.push({ rateId, username: u })
    saveBookmarks()
    const bookmarkCount = bookmarks.filter((b) => b.rateId === rateId).length
    res.status(201).json({ success: true, bookmarkCount })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/rates/:id/bookmark – body { username }
app.delete('/api/rates/:id/bookmark', (req, res) => {
  try {
    const rateId = req.params.id
    const { username } = req.body
    const u = username != null ? String(username).trim().toLowerCase() : ''
    if (!u) return res.status(400).json({ error: 'username required' })
    const before = bookmarks.length
    bookmarks = bookmarks.filter((b) => !(b.rateId === rateId && (b.username || '').toLowerCase() === u))
    if (bookmarks.length === before) return res.status(404).json({ error: 'Not bookmarked' })
    saveBookmarks()
    const bookmarkCount = bookmarks.filter((b) => b.rateId === rateId).length
    res.json({ success: true, bookmarkCount })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/rates/:id/comments – list comments for a rate (oldest first)
app.get('/api/rates/:id/comments', (req, res) => {
  try {
    const rateId = req.params.id
    if (!rates.some((r) => r.id === rateId)) return res.status(404).json({ error: 'Rate not found' })
    const list = comments.filter((c) => c.rateId === rateId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    res.json(list)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/rates/:id/comments – add a comment; body { username, displayName, body }
app.post('/api/rates/:id/comments', (req, res) => {
  try {
    const rateId = req.params.id
    const { username, displayName, body } = req.body
    const u = username != null ? String(username).trim().toLowerCase() : ''
    const name = displayName != null ? String(displayName).trim() : 'Guest'
    const text = body != null ? String(body).trim() : ''
    if (!u) return res.status(400).json({ error: 'username required' })
    if (!text) return res.status(400).json({ error: 'body required' })
    if (!rates.some((r) => r.id === rateId)) return res.status(404).json({ error: 'Rate not found' })
    const comment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      rateId,
      username: u,
      displayName: name || 'Guest',
      body: text,
      createdAt: new Date().toISOString(),
    }
    comments.push(comment)
    saveComments()
    const rate = rates.find((r) => r.id === rateId)
    const ownerHandle = rate ? (rate.raterHandle || '').trim().toLowerCase() : ''
    if (ownerHandle && ownerHandle !== u) {
      const bodySnippet = text.length > 80 ? text.slice(0, 80) + '…' : text
      notifications.unshift({
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: 'comment',
        createdAt: new Date().toISOString(),
        read: false,
        forUsername: ownerHandle,
        actorUsername: u,
        actorDisplayName: name || 'Guest',
        rateId,
        body: bodySnippet,
      })
      saveNotifications()
    }
    const commentCount = comments.filter((c) => c.rateId === rateId).length
    res.status(201).json({ comment, commentCount })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/rates – create a new rate
app.post('/api/rates', (req, res) => {
  try {
    const { gameName, rating, body, raterName, raterHandle, images, poll, scheduledAt } = req.body
    if (!gameName || typeof gameName !== 'string' || gameName.trim() === '') {
      return res.status(400).json({ error: 'Game name required' })
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 10) {
      return res.status(400).json({ error: 'Rating must be a number between 1 and 10' })
    }
    if (!body || typeof body !== 'string' || body.trim() === '') {
      return res.status(400).json({ error: 'Review text required' })
    }
    const name = String(raterName ?? '').trim() || 'Guest'
    const handle = String(raterHandle ?? '').trim() || 'guest'

    // Optional: scheduled time (for now, store as createdAt in the future; frontend can decide what to do)
    let createdAt = new Date().toISOString()
    if (scheduledAt && typeof scheduledAt === 'string') {
      const d = new Date(scheduledAt)
      if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now()) {
        createdAt = d.toISOString()
      }
    }

    // Optional: images (array of URLs served from /uploads)
    const imageUrls =
      Array.isArray(images) ?
        images
          .map((u) => (typeof u === 'string' ? u.trim() : ''))
          .filter((u) => u.startsWith('/uploads/')) :
        []

    // Optional: poll (question + 2–4 options)
    let pollData = undefined
    if (poll && typeof poll === 'object') {
      const question = String(poll.question ?? '').trim()
      const rawOptions = Array.isArray(poll.options) ? poll.options : []
      const optionTexts = rawOptions
        .map((o) => (o && typeof o === 'object' ? String(o.text ?? '').trim() : ''))
        .filter((t) => t.length > 0)
      if (question && optionTexts.length >= 2 && optionTexts.length <= 4) {
        pollData = {
          question,
          options: optionTexts.map((text, index) => ({
            id: `opt-${index + 1}`,
            text,
            votes: 0,
          })),
          totalVotes: 0,
        }
      }
    }
    const rate = {
      id: `rate-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      raterName: name,
      raterHandle: handle,
      gameName: gameName.trim(),
      rating: Math.min(10, Math.max(1, Number(rating))),
      body: body.trim(),
      createdAt,
      commentCount: 0,
      likeCount: 0,
      bookmarkCount: 0,
      repostCount: 0,
      images: imageUrls,
      poll: pollData,
    }
    rates.unshift(rate)
    saveRates()
    res.status(201).json(rate)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/notifications/unread-count?username=xxx – count of unread notifications for user
app.get('/api/notifications/unread-count', (req, res) => {
  try {
    const username = req.query.username
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'username required' })
    }
    const u = username.trim().toLowerCase()
    const count = notifications.filter((n) => (n.forUsername || '').toLowerCase() === u && !n.read).length
    res.json({ count })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/notifications?username=xxx – list notifications for user (newest first)
app.get('/api/notifications', (req, res) => {
  try {
    const username = req.query.username
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'username required' })
    }
    const u = username.trim().toLowerCase()
    const list = notifications.filter((n) => (n.forUsername || '').toLowerCase() === u)
    res.json(list)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/notifications/:id/read – mark one as read
app.patch('/api/notifications/:id/read', (req, res) => {
  try {
    const id = req.params.id
    const n = notifications.find((x) => x.id === id)
    if (!n) return res.status(404).json({ error: 'Notification not found' })
    n.read = true
    saveNotifications()
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/notifications/read-all – body { username } – mark all as read for user
app.patch('/api/notifications/read-all', (req, res) => {
  try {
    const { username } = req.body
    const u = username != null ? String(username).trim().toLowerCase() : ''
    if (!u) return res.status(400).json({ error: 'username required' })
    let count = 0
    notifications.forEach((n) => {
      if ((n.forUsername || '').toLowerCase() === u && !n.read) {
        n.read = true
        count++
      }
    })
    if (count > 0) saveNotifications()
    res.json({ success: true, marked: count })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/messages/conversations?username=xxx – list conversations (other participant + last message)
app.get('/api/messages/conversations', (req, res) => {
  try {
    const username = req.query.username
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'username required' })
    }
    const u = username.trim().toLowerCase()
    const forUser = (m) =>
      (m.senderUsername || '').toLowerCase() === u || (m.receiverUsername || '').toLowerCase() === u
    const withOther = (m, other) => {
      const s = (m.senderUsername || '').toLowerCase()
      const r = (m.receiverUsername || '').toLowerCase()
      return (s === u && r === other) || (r === u && s === other)
    }
    const others = new Set()
    messages.filter(forUser).forEach((m) => {
      const s = (m.senderUsername || '').toLowerCase()
      const r = (m.receiverUsername || '').toLowerCase()
      others.add(s === u ? r : s)
    })
    const list = Array.from(others).map((other) => {
      const convMessages = messages.filter((m) => withOther(m, other)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      const last = convMessages[0]
      return {
        otherUsername: other,
        lastMessage: last ? { body: last.body, createdAt: last.createdAt, fromMe: (last.senderUsername || '').toLowerCase() === u } : null,
        lastMessageAt: last ? last.createdAt : null,
      }
    })
    list.sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''))
    res.json(list)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/messages?username=xxx&with=yyy – messages between username and with (other user)
app.get('/api/messages', (req, res) => {
  try {
    const username = req.query.username
    const withUser = req.query.with
    if (!username || typeof username !== 'string' || !withUser || typeof withUser !== 'string') {
      return res.status(400).json({ error: 'username and with required' })
    }
    const u = username.trim().toLowerCase()
    const w = withUser.trim().toLowerCase()
    const between = (m) => {
      const s = (m.senderUsername || '').toLowerCase()
      const r = (m.receiverUsername || '').toLowerCase()
      return (s === u && r === w) || (s === w && r === u)
    }
    const list = messages.filter(between).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    res.json(list)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/messages – body { senderUsername, receiverUsername, body }
app.post('/api/messages', (req, res) => {
  try {
    const { senderUsername, receiverUsername, body } = req.body
    const sender = senderUsername != null ? String(senderUsername).trim().toLowerCase() : ''
    const receiver = receiverUsername != null ? String(receiverUsername).trim().toLowerCase() : ''
    const text = body != null ? String(body).trim() : ''
    if (!sender || !receiver) return res.status(400).json({ error: 'senderUsername and receiverUsername required' })
    if (!text) return res.status(400).json({ error: 'body required' })
    if (sender === receiver) return res.status(400).json({ error: 'Cannot message yourself' })
    const msg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      senderUsername: sender,
      receiverUsername: receiver,
      body: text,
      createdAt: new Date().toISOString(),
    }
    messages.push(msg)
    saveMessages()
    res.status(201).json(msg)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/upload-image – upload a single image file and return its URL
app.post('/api/upload-image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }
    const url = `/uploads/${req.file.filename}`
    res.status(201).json({ url })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

// Keep process alive when stdin is closed (e.g. run in background)
process.stdin.resume()
