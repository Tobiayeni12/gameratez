import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import dns from 'dns'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import nodemailer from 'nodemailer'
import multer from 'multer'
import { Resend } from 'resend'
import crypto from 'crypto'
import { dbEnabled, initDb, query } from './db.mjs'

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
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json')

const app = express()
app.set('trust proxy', 1)

const PORT = process.env.PORT || 3001
const SITE_URL = process.env.SITE_URL || 'http://localhost:5173'
const CORS_ORIGINS = (process.env.CORS_ORIGINS || SITE_URL)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, cb) {
      // allow non-browser clients (no origin header)
      if (!origin) return cb(null, true)
      if (CORS_ORIGINS.includes(origin)) return cb(null, true)
      return cb(new Error('Not allowed by CORS'))
    },
    credentials: true,
  }),
)
app.use(express.json())

// Basic global rate limit (per IP)
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 240,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }),
)

// Stricter limits on auth endpoints
app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60_000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }),
)

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
let bookmarks = []                // array of { rateId, username }
let messages = []                 // array of { id, senderUsername, receiverUsername, body, createdAt }
let reports = []                  // array of { id, rateId, reporterUsername, reason, createdAt }

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

function loadReports() {
  try {
    if (!fs.existsSync(REPORTS_FILE)) return
    const raw = fs.readFileSync(REPORTS_FILE, 'utf8')
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) reports = arr
  } catch (err) {
    console.warn('Could not load reports from file:', err.message)
  }
}

function saveReports() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2), 'utf8')
  } catch (err) {
    console.error('Could not save reports:', err.message)
  }
}

loadReports()

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
    if (dbEnabled) {
      const existing = await query('SELECT 1 FROM users WHERE email = $1 LIMIT 1', [normalizedEmail])
      if (existing.rowCount > 0) {
        return res.status(409).json({ error: 'An account with this email already exists' })
      }
    } else {
      if (users.has(normalizedEmail)) {
        return res.status(409).json({ error: 'An account with this email already exists' })
      }
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
app.post('/api/auth/complete', async (req, res) => {
  try {
    const { completeToken, displayName, username, favoriteGameKinds, feedPreference, platform } = req.body
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

    if (dbEnabled) {
      const existing = await query('SELECT 1 FROM users WHERE email = $1 LIMIT 1', [data.email])
      if (existing.rowCount > 0) {
        completeTokens.delete(completeToken)
        return res.status(409).json({ error: 'Account already completed' })
      }
    } else {
      const user = users.get(data.email)
      if (user) {
        completeTokens.delete(completeToken)
        return res.status(409).json({ error: 'Account already completed' })
      }
    }

    const handle = String(username).trim().replace(/^@/, '')
    const normalizedPlatform =
      platform === 'ps' || platform === 'xbox' || platform === 'pc' ? platform : ''

    const profile = {
      id: `profile-${Date.now()}`,
      email: data.email,
      displayName: String(displayName).trim(),
      username: handle,
      bio: '',
      favoriteGameKinds: Array.isArray(favoriteGameKinds) ? favoriteGameKinds : [],
      feedPreference: typeof feedPreference === 'string' ? feedPreference : 'all',
      createdAt: new Date().toISOString(),
      platform: normalizedPlatform,
    }
    if (dbEnabled) {
      const handleLower = handle.trim().toLowerCase()
      if (!handleLower) return res.status(400).json({ error: 'username required' })
      const existingUsername = await query('SELECT 1 FROM users WHERE lower(username) = $1 LIMIT 1', [handleLower])
      if (existingUsername.rowCount > 0) {
        completeTokens.delete(completeToken)
        return res.status(409).json({ error: 'Username is already taken' })
      }

      await query(
        `INSERT INTO users (id, email, username, display_name, bio, favorite_game_kinds, feed_preference, platform, password_hash, created_at)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10::timestamptz)`,
        [
          profile.id,
          profile.email,
          profile.username,
          profile.displayName,
          profile.bio,
          JSON.stringify(profile.favoriteGameKinds),
          profile.feedPreference,
          profile.platform,
          data.passwordHash ?? null,
          profile.createdAt,
        ],
      )
    } else {
      users.set(data.email, { ...profile, passwordHash: data.passwordHash ?? null })
      saveUsers()
    }
    completeTokens.delete(completeToken)

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
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password required' })
    }
    const normalizedEmail = email.trim().toLowerCase()
    const user = dbEnabled
      ? (await query('SELECT id, email, username, display_name, bio, favorite_game_kinds, feed_preference, platform, password_hash, created_at FROM users WHERE email = $1 LIMIT 1', [normalizedEmail])).rows[0]
      : users.get(normalizedEmail)
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    const passwordHash = dbEnabled ? user.password_hash : user.passwordHash
    if (!passwordHash) {
      return res.status(400).json({ error: 'This account uses Google sign-in. Use Continue with Google.' })
    }
    const hash = hashPassword(password)
    if (hash !== passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    const profile = dbEnabled
      ? {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          username: user.username,
          bio: user.bio ?? '',
          favoriteGameKinds: Array.isArray(user.favorite_game_kinds) ? user.favorite_game_kinds : [],
          feedPreference: user.feed_preference ?? 'all',
          createdAt: (user.created_at ? new Date(user.created_at).toISOString() : new Date().toISOString()),
          platform: user.platform ?? '',
        }
      : profileWithoutPassword(user)
    res.json({ success: true, profile })
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
// Optional ?platform=ps|xbox|pc filters by primary platform of rater for that rate
app.get('/api/rates', async (req, res) => {
  try {
    const { tab, username, raterHandle, bookmarkedBy, platform } = req.query
    const now = Date.now()
    if (dbEnabled) {
      const currentUser =
        (typeof username === 'string' && username.trim()) ||
        (typeof bookmarkedBy === 'string' && bookmarkedBy.trim()) ||
        ''
      const currentLower = currentUser ? currentUser.trim().toLowerCase() : ''

      const params = []
      let i = 1
      const where = ['r.created_at <= now()']
      const joins = []

      // tab=following filter
      if (tab === 'following' && typeof username === 'string' && username.trim()) {
        joins.push('JOIN follows f ON f.followee_username = lower(r.rater_handle) AND f.follower_username = $' + i)
        params.push(username.trim().toLowerCase())
        i++
      }

      // bookmarkedBy filter
      if (typeof bookmarkedBy === 'string' && bookmarkedBy.trim()) {
        joins.push('JOIN bookmarks bm_filter ON bm_filter.rate_id = r.id AND bm_filter.username = $' + i)
        params.push(bookmarkedBy.trim().toLowerCase())
        i++
      }

      // raterHandle filter
      if (typeof raterHandle === 'string' && raterHandle.trim()) {
        where.push('lower(r.rater_handle) = $' + i)
        params.push(raterHandle.trim().toLowerCase())
        i++
      }

      // platform filter
      if (platform && typeof platform === 'string') {
        const p = platform.trim().toLowerCase()
        if (p === 'ps' || p === 'xbox' || p === 'pc') {
          where.push('r.platform = $' + i)
          params.push(p)
          i++
        }
      }

      // current user param for liked/bookmarked flags
      params.push(currentLower || null)
      const currentParam = '$' + i

      const sql = `
        SELECT
          r.id,
          r.rater_name AS "raterName",
          r.rater_handle AS "raterHandle",
          r.game_name AS "gameName",
          r.rating,
          r.body,
          r.created_at AS "createdAt",
          COALESCE(r.images, '[]'::jsonb) AS images,
          r.poll AS poll,
          r.platform AS platform,
          COALESCE(lc.c, 0)::int AS "likeCount",
          COALESCE(cc.c, 0)::int AS "commentCount",
          COALESCE(bc.c, 0)::int AS "bookmarkCount",
          0::int AS "repostCount",
          CASE
            WHEN ${currentParam} IS NULL THEN false
            ELSE EXISTS (SELECT 1 FROM likes l WHERE l.rate_id = r.id AND l.username = ${currentParam})
          END AS liked,
          CASE
            WHEN ${currentParam} IS NULL THEN false
            ELSE EXISTS (SELECT 1 FROM bookmarks b WHERE b.rate_id = r.id AND b.username = ${currentParam})
          END AS bookmarked
        FROM rates r
          ${joins.join('\n          ')}
          LEFT JOIN (SELECT rate_id, COUNT(*)::int AS c FROM likes GROUP BY rate_id) lc ON lc.rate_id = r.id
          LEFT JOIN (SELECT rate_id, COUNT(*)::int AS c FROM comments GROUP BY rate_id) cc ON cc.rate_id = r.id
          LEFT JOIN (SELECT rate_id, COUNT(*)::int AS c FROM bookmarks GROUP BY rate_id) bc ON bc.rate_id = r.id
        WHERE ${where.join(' AND ')}
        ORDER BY r.created_at DESC
        LIMIT 200
      `
      const r = await query(sql, params)
      return res.json(
        r.rows.map((row) => ({
          ...row,
          // ensure JSON fields are arrays/objects
          images: Array.isArray(row.images) ? row.images : [],
        })),
      )
    }
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

    // Optional: filter by platform (primary platform of rater for this rate)
    if (platform && typeof platform === 'string') {
      const p = platform.trim().toLowerCase()
      if (p === 'ps' || p === 'xbox' || p === 'pc') {
        list = list.filter((r) => (r.platform || '').toLowerCase() === p)
      }
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
app.get('/api/rates/:id', async (req, res) => {
  try {
    const id = req.params.id
    const username = req.query.username
    if (dbEnabled) {
      const u = typeof username === 'string' && username.trim() ? username.trim().toLowerCase() : null
      const sql = `
        SELECT
          r.id,
          r.rater_name AS "raterName",
          r.rater_handle AS "raterHandle",
          r.game_name AS "gameName",
          r.rating,
          r.body,
          r.created_at AS "createdAt",
          COALESCE(r.images, '[]'::jsonb) AS images,
          r.poll AS poll,
          r.platform AS platform,
          COALESCE(lc.c, 0)::int AS "likeCount",
          COALESCE(cc.c, 0)::int AS "commentCount",
          COALESCE(bc.c, 0)::int AS "bookmarkCount",
          0::int AS "repostCount",
          CASE
            WHEN $2::text IS NULL THEN false
            ELSE EXISTS (SELECT 1 FROM likes l WHERE l.rate_id = r.id AND l.username = $2)
          END AS liked,
          CASE
            WHEN $2::text IS NULL THEN false
            ELSE EXISTS (SELECT 1 FROM bookmarks b WHERE b.rate_id = r.id AND b.username = $2)
          END AS bookmarked
        FROM rates r
          LEFT JOIN (SELECT rate_id, COUNT(*)::int AS c FROM likes GROUP BY rate_id) lc ON lc.rate_id = r.id
          LEFT JOIN (SELECT rate_id, COUNT(*)::int AS c FROM comments GROUP BY rate_id) cc ON cc.rate_id = r.id
          LEFT JOIN (SELECT rate_id, COUNT(*)::int AS c FROM bookmarks GROUP BY rate_id) bc ON bc.rate_id = r.id
        WHERE r.id = $1 AND r.created_at <= now()
        LIMIT 1
      `
      const r = await query(sql, [id, u])
      if (r.rowCount === 0) return res.status(404).json({ error: 'Rate not found' })
      const row = r.rows[0]
      return res.json({ ...row, images: Array.isArray(row.images) ? row.images : [] })
    }
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
app.get('/api/search', async (req, res) => {
  try {
    const q = (req.query.q && String(req.query.q).trim()) || ''
    const qLower = q.toLowerCase()
    const usersList = []
    if (q.length >= 1) {
      if (dbEnabled) {
        const like = `%${qLower}%`
        const usersRes = await query(
          `SELECT username, display_name AS "displayName"
           FROM users
           WHERE lower(username) LIKE $1 OR lower(display_name) LIKE $1
           ORDER BY created_at DESC
           LIMIT 20`,
          [like],
        )
        const ratesRes = await query(
          `SELECT
             r.id,
             r.rater_name AS "raterName",
             r.rater_handle AS "raterHandle",
             r.game_name AS "gameName",
             r.rating,
             r.body,
             r.created_at AS "createdAt",
             r.platform AS platform,
             COALESCE(lc.c, 0)::int AS "likeCount",
             COALESCE(cc.c, 0)::int AS "commentCount",
             COALESCE(bc.c, 0)::int AS "bookmarkCount",
             0::int AS "repostCount"
           FROM rates r
             LEFT JOIN (SELECT rate_id, COUNT(*)::int AS c FROM likes GROUP BY rate_id) lc ON lc.rate_id = r.id
             LEFT JOIN (SELECT rate_id, COUNT(*)::int AS c FROM comments GROUP BY rate_id) cc ON cc.rate_id = r.id
             LEFT JOIN (SELECT rate_id, COUNT(*)::int AS c FROM bookmarks GROUP BY rate_id) bc ON bc.rate_id = r.id
           WHERE r.created_at <= now()
             AND (lower(r.game_name) LIKE $1 OR lower(r.body) LIKE $1 OR lower(r.rater_handle) LIKE $1)
           ORDER BY r.created_at DESC
           LIMIT 50`,
          [like],
        )
        return res.json({ users: usersRes.rows, rates: ratesRes.rows })
      }
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

// GET /api/users/profile?username=xxx – public profile (displayName, username, platform) for viewing another user
app.get('/api/users/profile', async (req, res) => {
  try {
    const username = req.query.username
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'username required' })
    }
    const u = username.trim().toLowerCase()
    if (dbEnabled) {
      const r = await query(
        'SELECT username, display_name, platform FROM users WHERE lower(username) = $1 LIMIT 1',
        [u],
      )
      const user = r.rows[0]
      if (user) {
        return res.json({
          username: (user.username || '').trim(),
          displayName: (user.display_name || '').trim(),
          platform:
            user.platform === 'ps' || user.platform === 'xbox' || user.platform === 'pc'
              ? user.platform
              : '',
        })
      }
    } else {
      for (const user of users.values()) {
        if (user && (user.username || '').toLowerCase() === u) {
          return res.json({
            username: (user.username || '').trim(),
            displayName: (user.displayName || '').trim(),
            platform:
              user.platform === 'ps' || user.platform === 'xbox' || user.platform === 'pc'
                ? user.platform
                : '',
          })
        }
      }
    }
    res.status(404).json({ error: 'User not found' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/following?username=xxx – list usernames that xxx follows
app.get('/api/following', async (req, res) => {
  try {
    const username = req.query.username
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'username required' })
    }
    const u = username.trim().toLowerCase()
    if (dbEnabled) {
      const r = await query(
        'SELECT followee_username FROM follows WHERE follower_username = $1',
        [u],
      )
      return res.json(r.rows.map((x) => x.followee_username))
    }
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
app.post('/api/follow', async (req, res) => {
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
    if (dbEnabled) {
      const r = await query(
        'INSERT INTO follows (follower_username, followee_username) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [follower, followee],
      )
      if (r.rowCount === 0) return res.status(409).json({ error: 'Already following' })

      await query(
        `INSERT INTO notifications (id, type, created_at, read, for_username, actor_username)
         VALUES ($1,'follow',now(),false,$2,$3)`,
        [`notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, followee, follower],
      )

      return res.status(201).json({ success: true })
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
app.delete('/api/follow', async (req, res) => {
  try {
    const { followerUsername, followeeUsername } = req.body
    const follower = String(followerUsername ?? '').trim().toLowerCase()
    const followee = String(followeeUsername ?? '').trim().toLowerCase()
    if (!follower || !followee) {
      return res.status(400).json({ error: 'followerUsername and followeeUsername required' })
    }
    if (dbEnabled) {
      const r = await query(
        'DELETE FROM follows WHERE follower_username = $1 AND followee_username = $2',
        [follower, followee],
      )
      if (r.rowCount === 0) return res.status(404).json({ error: 'Not following' })
      return res.json({ success: true })
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
app.post('/api/rates/:id/like', async (req, res) => {
  try {
    const rateId = req.params.id
    const { username } = req.body
    const u = username != null ? String(username).trim().toLowerCase() : ''
    if (!u) return res.status(400).json({ error: 'username required' })
    if (dbEnabled) {
      const exists = await query('SELECT rater_handle, game_name FROM rates WHERE id = $1 LIMIT 1', [rateId])
      if (exists.rowCount === 0) return res.status(404).json({ error: 'Rate not found' })

      const ins = await query(
        'INSERT INTO likes (rate_id, username) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [rateId, u],
      )
      const likeCount = Number((await query('SELECT COUNT(*)::int AS c FROM likes WHERE rate_id = $1', [rateId])).rows[0]?.c ?? 0)
      if (ins.rowCount === 0) return res.status(409).json({ error: 'Already liked', likeCount })

      const ownerHandle = (exists.rows[0]?.rater_handle || '').trim().toLowerCase()
      const gameName = exists.rows[0]?.game_name || ''
      if (ownerHandle && ownerHandle !== u) {
        await query(
          `INSERT INTO notifications (id, type, created_at, read, for_username, actor_username, rate_id, game_name)
           VALUES ($1,'like',now(),false,$2,$3,$4,$5)`,
          [`notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, ownerHandle, u, rateId, gameName],
        )
      }

      return res.status(201).json({ success: true, likeCount })
    }
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
app.delete('/api/rates/:id/like', async (req, res) => {
  try {
    const rateId = req.params.id
    const { username } = req.body
    const u = username != null ? String(username).trim().toLowerCase() : ''
    if (!u) return res.status(400).json({ error: 'username required' })
    if (dbEnabled) {
      const del = await query('DELETE FROM likes WHERE rate_id = $1 AND username = $2', [rateId, u])
      if (del.rowCount === 0) return res.status(404).json({ error: 'Not liked' })
      const likeCount = Number((await query('SELECT COUNT(*)::int AS c FROM likes WHERE rate_id = $1', [rateId])).rows[0]?.c ?? 0)
      return res.json({ success: true, likeCount })
    }
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
app.post('/api/rates/:id/bookmark', async (req, res) => {
  try {
    const rateId = req.params.id
    const { username } = req.body
    const u = username != null ? String(username).trim().toLowerCase() : ''
    if (!u) return res.status(400).json({ error: 'username required' })
    if (dbEnabled) {
      const exists = await query('SELECT 1 FROM rates WHERE id = $1 LIMIT 1', [rateId])
      if (exists.rowCount === 0) return res.status(404).json({ error: 'Rate not found' })
      const ins = await query(
        'INSERT INTO bookmarks (rate_id, username) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [rateId, u],
      )
      const bookmarkCount = Number((await query('SELECT COUNT(*)::int AS c FROM bookmarks WHERE rate_id = $1', [rateId])).rows[0]?.c ?? 0)
      if (ins.rowCount === 0) return res.status(409).json({ error: 'Already bookmarked', bookmarkCount })
      return res.status(201).json({ success: true, bookmarkCount })
    }
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

// POST /api/rates/:id/report – basic reporting for moderation
app.post('/api/rates/:id/report', async (req, res) => {
  try {
    const rateId = req.params.id
    const { username, reason } = req.body || {}
    const reporter = username != null ? String(username).trim().toLowerCase() : ''
    if (!reporter) return res.status(400).json({ error: 'username required' })
    if (dbEnabled) {
      const exists = await query('SELECT 1 FROM rates WHERE id = $1 LIMIT 1', [rateId])
      if (exists.rowCount === 0) return res.status(404).json({ error: 'Rate not found' })
      const reportId = `report-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      await query(
        `INSERT INTO reports (id, rate_id, reporter_username, reason, created_at)
         VALUES ($1,$2,$3,$4,$5::timestamptz)`,
        [reportId, rateId, reporter, typeof reason === 'string' ? reason.slice(0, 280) : '', new Date().toISOString()],
      )
      return res.status(201).json({ success: true })
    }
    const rate = rates.find((r) => r.id === rateId)
    if (!rate) return res.status(404).json({ error: 'Rate not found' })

    const report = {
      id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      rateId,
      reporterUsername: reporter,
      reason: typeof reason === 'string' ? reason.slice(0, 280) : '',
      createdAt: new Date().toISOString(),
    }
    reports.push(report)
    saveReports()
    res.status(201).json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/admin/rates/:id – remove a rate (admin only)
app.delete('/api/admin/rates/:id', async (req, res) => {
  try {
    const token = String(req.headers['x-admin-token'] || '').trim()
    const expected = String(process.env.ADMIN_TOKEN || '').trim()
    if (!expected || token !== expected) return res.status(401).json({ error: 'Unauthorized' })

    const rateId = req.params.id
    if (!rateId) return res.status(400).json({ error: 'rateId required' })

    if (dbEnabled) {
      const del = await query('DELETE FROM rates WHERE id = $1', [rateId])
      if (del.rowCount === 0) return res.status(404).json({ error: 'Rate not found' })
      return res.json({ success: true })
    }

    const before = rates.length
    rates = rates.filter((r) => r.id !== rateId)
    if (rates.length === before) return res.status(404).json({ error: 'Rate not found' })
    likes = likes.filter((l) => l.rateId !== rateId)
    bookmarks = bookmarks.filter((b) => b.rateId !== rateId)
    comments = comments.filter((c) => c.rateId !== rateId)
    reports = reports.filter((rp) => rp.rateId !== rateId)
    notifications = notifications.filter((n) => n.rateId !== rateId)
    saveRates()
    saveLikes()
    saveBookmarks()
    saveComments()
    saveReports()
    saveNotifications()
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/rates/:id/bookmark – body { username }
app.delete('/api/rates/:id/bookmark', async (req, res) => {
  try {
    const rateId = req.params.id
    const { username } = req.body
    const u = username != null ? String(username).trim().toLowerCase() : ''
    if (!u) return res.status(400).json({ error: 'username required' })
    if (dbEnabled) {
      const del = await query('DELETE FROM bookmarks WHERE rate_id = $1 AND username = $2', [rateId, u])
      if (del.rowCount === 0) return res.status(404).json({ error: 'Not bookmarked' })
      const bookmarkCount = Number((await query('SELECT COUNT(*)::int AS c FROM bookmarks WHERE rate_id = $1', [rateId])).rows[0]?.c ?? 0)
      return res.json({ success: true, bookmarkCount })
    }
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
app.get('/api/rates/:id/comments', async (req, res) => {
  try {
    const rateId = req.params.id
    if (dbEnabled) {
      const exists = await query('SELECT 1 FROM rates WHERE id = $1 LIMIT 1', [rateId])
      if (exists.rowCount === 0) return res.status(404).json({ error: 'Rate not found' })
      const r = await query(
        'SELECT id, rate_id AS "rateId", username, display_name AS "displayName", body, created_at AS "createdAt" FROM comments WHERE rate_id = $1 ORDER BY created_at ASC',
        [rateId],
      )
      return res.json(r.rows)
    }
    if (!rates.some((r) => r.id === rateId)) return res.status(404).json({ error: 'Rate not found' })
    const list = comments.filter((c) => c.rateId === rateId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    res.json(list)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/rates/:id/comments – add a comment; body { username, displayName, body }
app.post('/api/rates/:id/comments', async (req, res) => {
  try {
    const rateId = req.params.id
    const { username, displayName, body } = req.body
    const u = username != null ? String(username).trim().toLowerCase() : ''
    const name = displayName != null ? String(displayName).trim() : 'Guest'
    const text = body != null ? String(body).trim() : ''
    if (!u) return res.status(400).json({ error: 'username required' })
    if (!text) return res.status(400).json({ error: 'body required' })
    if (dbEnabled) {
      const rateRow = await query('SELECT rater_handle FROM rates WHERE id = $1 LIMIT 1', [rateId])
      if (rateRow.rowCount === 0) return res.status(404).json({ error: 'Rate not found' })
      const comment = {
        id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        rateId,
        username: u,
        displayName: name || 'Guest',
        body: text,
        createdAt: new Date().toISOString(),
      }
      await query(
        `INSERT INTO comments (id, rate_id, username, display_name, body, created_at)
         VALUES ($1,$2,$3,$4,$5,$6::timestamptz)`,
        [comment.id, rateId, u, comment.displayName, comment.body, comment.createdAt],
      )

      const ownerHandle = (rateRow.rows[0]?.rater_handle || '').trim().toLowerCase()
      if (ownerHandle && ownerHandle !== u) {
        try {
          const bodySnippet = text.length > 80 ? text.slice(0, 80) + '…' : text
          await query(
            `INSERT INTO notifications (id, type, created_at, read, for_username, actor_username, actor_display_name, rate_id, body)
             VALUES ($1,'comment',now(),false,$2,$3,$4,$5,$6)`,
            [`notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, ownerHandle, u, comment.displayName, rateId, bodySnippet],
          )
        } catch (notifErr) {
          console.error('Failed to create notification for comment:', notifErr)
        }
      }

      const commentCount = Number((await query('SELECT COUNT(*)::int AS c FROM comments WHERE rate_id = $1', [rateId])).rows[0]?.c ?? 0)
      return res.status(201).json({ comment, commentCount })
    }
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
      try {
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
      } catch (notifErr) {
        console.error('Failed to create notification for comment:', notifErr)
      }
    }
    const commentCount = comments.filter((c) => c.rateId === rateId).length
    res.status(201).json({ comment, commentCount })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/rates – create a new rate
app.post('/api/rates', async (req, res) => {
  try {
    const { gameName, rating, body, raterName, raterHandle, images, poll, scheduledAt, platform } = req.body
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

    const normalizedPlatform =
      platform === 'ps' || platform === 'xbox' || platform === 'pc' ? platform : ''

    // Optional: scheduled time (for now, store as createdAt in the future; frontend can decide what to do)
    let createdAt = new Date().toISOString()
    if (scheduledAt && typeof scheduledAt === 'string') {
      const d = new Date(scheduledAt)
      if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now()) {
        createdAt = d.toISOString()
      }
    }

    // Optional: images (array of URLs or relative paths like /uploads/...)
    const imageUrls = Array.isArray(images)
      ? images
          .map((u) => (typeof u === 'string' ? u.trim() : ''))
          .filter((u) => u.length > 0)
      : []

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
      platform: normalizedPlatform,
    }
    if (dbEnabled) {
      await query(
        `INSERT INTO rates (id, rater_name, rater_handle, game_name, rating, body, created_at, images, poll, platform)
         VALUES ($1,$2,$3,$4,$5,$6,$7::timestamptz,$8::jsonb,$9::jsonb,$10)`,
        [
          rate.id,
          rate.raterName,
          rate.raterHandle,
          rate.gameName,
          rate.rating,
          rate.body,
          rate.createdAt,
          JSON.stringify(rate.images),
          rate.poll ? JSON.stringify(rate.poll) : null,
          rate.platform,
        ],
      )
      return res.status(201).json(rate)
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
app.get('/api/notifications/unread-count', async (req, res) => {
  try {
    const username = req.query.username
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'username required' })
    }
    const u = username.trim().toLowerCase()
    if (dbEnabled) {
      const r = await query(
        'SELECT COUNT(*)::int AS c FROM notifications WHERE for_username = $1 AND read = false',
        [u],
      )
      return res.json({ count: Number(r.rows[0]?.c ?? 0) })
    }
    const count = notifications.filter((n) => (n.forUsername || '').toLowerCase() === u && !n.read).length
    res.json({ count })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/notifications?username=xxx – list notifications for user (newest first)
app.get('/api/notifications', async (req, res) => {
  try {
    const username = req.query.username
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'username required' })
    }
    const u = username.trim().toLowerCase()
    if (dbEnabled) {
      const r = await query(
        `SELECT
           id,
           type,
           created_at AS "createdAt",
           read,
           for_username AS "forUsername",
           actor_username AS "actorUsername",
           actor_display_name AS "actorDisplayName",
           rate_id AS "rateId",
           game_name AS "gameName",
           body
         FROM notifications
         WHERE for_username = $1
         ORDER BY created_at DESC
         LIMIT 200`,
        [u],
      )
      return res.json(r.rows)
    }
    const list = notifications.filter((n) => (n.forUsername || '').toLowerCase() === u)
    res.json(list)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/notifications/:id/read – mark one as read
app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const id = req.params.id
    if (dbEnabled) {
      const r = await query('UPDATE notifications SET read = true WHERE id = $1', [id])
      if (r.rowCount === 0) return res.status(404).json({ error: 'Notification not found' })
      return res.json({ success: true })
    }
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
app.patch('/api/notifications/read-all', async (req, res) => {
  try {
    const { username } = req.body
    const u = username != null ? String(username).trim().toLowerCase() : ''
    if (!u) return res.status(400).json({ error: 'username required' })
    if (dbEnabled) {
      const r = await query('UPDATE notifications SET read = true WHERE for_username = $1 AND read = false', [u])
      return res.json({ success: true, marked: r.rowCount })
    }
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
app.get('/api/messages/conversations', async (req, res) => {
  try {
    const username = req.query.username
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'username required' })
    }
    const u = username.trim().toLowerCase()
    if (dbEnabled) {
      const r = await query(
        `SELECT id, sender_username AS "senderUsername", receiver_username AS "receiverUsername", body, created_at AS "createdAt"
         FROM messages
         WHERE sender_username = $1 OR receiver_username = $1
         ORDER BY created_at DESC
         LIMIT 500`,
        [u],
      )
      const msgs = r.rows
      const byOther = new Map()
      for (const m of msgs) {
        const s = (m.senderUsername || '').toLowerCase()
        const rcv = (m.receiverUsername || '').toLowerCase()
        const other = s === u ? rcv : s
        if (!other) continue
        if (!byOther.has(other)) {
          byOther.set(other, {
            otherUsername: other,
            lastMessage: { body: m.body, createdAt: m.createdAt, fromMe: s === u },
            lastMessageAt: m.createdAt,
          })
        }
      }
      const list = Array.from(byOther.values()).sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''))
      return res.json(list)
    }
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
app.get('/api/messages', async (req, res) => {
  try {
    const username = req.query.username
    const withUser = req.query.with
    if (!username || typeof username !== 'string' || !withUser || typeof withUser !== 'string') {
      return res.status(400).json({ error: 'username and with required' })
    }
    const u = username.trim().toLowerCase()
    const w = withUser.trim().toLowerCase()
    if (dbEnabled) {
      const r = await query(
        `SELECT id, sender_username AS "senderUsername", receiver_username AS "receiverUsername", body, created_at AS "createdAt"
         FROM messages
         WHERE (sender_username = $1 AND receiver_username = $2)
            OR (sender_username = $2 AND receiver_username = $1)
         ORDER BY created_at ASC`,
        [u, w],
      )
      return res.json(r.rows)
    }
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
app.post('/api/messages', async (req, res) => {
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
    if (dbEnabled) {
      await query(
        `INSERT INTO messages (id, sender_username, receiver_username, body, created_at)
         VALUES ($1,$2,$3,$4,$5::timestamptz)`,
        [msg.id, msg.senderUsername, msg.receiverUsername, msg.body, msg.createdAt],
      )
      return res.status(201).json(msg)
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

// Simple health check for monitoring / uptime checks
app.get('/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() })
})

async function start() {
  if (dbEnabled) {
    await initDb()
    console.log('Database: connected')
  } else {
    console.log('Database: disabled (using local JSON storage)')
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})

// Keep process alive when stdin is closed (e.g. run in background)
process.stdin.resume()
