import pg from 'pg'

const { Pool } = pg

export const DATABASE_URL = process.env.DATABASE_URL || ''
export const dbEnabled = Boolean(DATABASE_URL && DATABASE_URL.trim().length > 0)

export const pool =
  dbEnabled
    ? new Pool({
        connectionString: DATABASE_URL,
        ssl:
          process.env.PGSSL === 'false'
            ? false
            : { rejectUnauthorized: false },
      })
    : null

export async function query(text, params = []) {
  if (!pool) throw new Error('Database not configured (missing DATABASE_URL)')
  return pool.query(text, params)
}

export async function initDb() {
  if (!pool) return

  // Core tables. Idempotent: safe to run on every start.
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT UNIQUE NOT NULL,
      email TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      bio TEXT NOT NULL DEFAULT '',
      favorite_game_kinds JSONB NOT NULL DEFAULT '[]'::jsonb,
      feed_preference TEXT NOT NULL DEFAULT 'all',
      platform TEXT NOT NULL DEFAULT '',
      password_hash TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  // Backfill for older installs (no-op if already present)
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS id TEXT;`)
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS users_id_unique_idx ON users(id) WHERE id IS NOT NULL;`)

  await query(`
    CREATE TABLE IF NOT EXISTS rates (
      id TEXT PRIMARY KEY,
      rater_name TEXT NOT NULL,
      rater_handle TEXT NOT NULL,
      game_name TEXT NOT NULL,
      rating INT NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      images JSONB NOT NULL DEFAULT '[]'::jsonb,
      poll JSONB,
      platform TEXT NOT NULL DEFAULT ''
    );
  `)
  await query(`CREATE INDEX IF NOT EXISTS rates_created_at_idx ON rates(created_at DESC);`)
  await query(`CREATE INDEX IF NOT EXISTS rates_rater_handle_idx ON rates(rater_handle);`)
  await query(`CREATE INDEX IF NOT EXISTS rates_platform_idx ON rates(platform);`)

  await query(`
    CREATE TABLE IF NOT EXISTS follows (
      follower_username TEXT NOT NULL,
      followee_username TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (follower_username, followee_username)
    );
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS likes (
      rate_id TEXT NOT NULL REFERENCES rates(id) ON DELETE CASCADE,
      username TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (rate_id, username)
    );
  `)
  await query(`CREATE INDEX IF NOT EXISTS likes_username_idx ON likes(username);`)

  await query(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      rate_id TEXT NOT NULL REFERENCES rates(id) ON DELETE CASCADE,
      username TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (rate_id, username)
    );
  `)
  await query(`CREATE INDEX IF NOT EXISTS bookmarks_username_idx ON bookmarks(username);`)

  await query(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      rate_id TEXT NOT NULL REFERENCES rates(id) ON DELETE CASCADE,
      username TEXT NOT NULL,
      display_name TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  await query(`CREATE INDEX IF NOT EXISTS comments_rate_id_idx ON comments(rate_id);`)

  await query(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      rate_id TEXT NOT NULL REFERENCES rates(id) ON DELETE CASCADE,
      reporter_username TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  await query(`CREATE INDEX IF NOT EXISTS reports_rate_id_idx ON reports(rate_id);`)

  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      read BOOLEAN NOT NULL DEFAULT false,
      for_username TEXT NOT NULL,
      actor_username TEXT NOT NULL,
      actor_display_name TEXT,
      rate_id TEXT REFERENCES rates(id) ON DELETE CASCADE,
      game_name TEXT,
      body TEXT
    );
  `)
  await query(`CREATE INDEX IF NOT EXISTS notifications_for_username_idx ON notifications(for_username, read, created_at DESC);`)

  await query(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_username TEXT NOT NULL,
      receiver_username TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  await query(`CREATE INDEX IF NOT EXISTS messages_participants_idx ON messages(sender_username, receiver_username, created_at DESC);`)
}

