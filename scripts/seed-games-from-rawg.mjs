#!/usr/bin/env node
/**
 * Fetches a large list of popular games from RAWG and writes src/data/gamesList.json.
 * Get a free API key at https://rawg.io/login/?forward=developer
 *
 * Usage: RAWG_API_KEY=your_key node scripts/seed-games-from-rawg.mjs
 */

import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const KEY = process.env.RAWG_API_KEY
const OUT_PATH = join(__dirname, '..', 'src', 'data', 'gamesList.json')
const PAGE_SIZE = 40
const MAX_PAGES = 80 // 80 * 40 = 3200 games
const SEEN = new Set()

if (!KEY) {
  console.error('Set RAWG_API_KEY. Get a free key at https://rawg.io/login/?forward=developer')
  process.exit(1)
}

async function fetchPage(page, ordering = '-rating') {
  const url = new URL('https://api.rawg.io/api/games')
  url.searchParams.set('key', KEY)
  url.searchParams.set('page_size', String(PAGE_SIZE))
  url.searchParams.set('page', String(page))
  url.searchParams.set('ordering', ordering)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`RAWG API ${res.status}: ${await res.text()}`)
  return res.json()
}

async function main() {
  const allNames = []

  for (const ordering of ['-rating', '-released', '-metacritic']) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const data = await fetchPage(page, ordering)
      const results = data.results || []
      if (results.length === 0) break
      for (const g of results) {
        const name = g.name
        if (name && !SEEN.has(name)) {
          SEEN.add(name)
          allNames.push(name)
        }
      }
      process.stdout.write(`\rFetched ${allNames.length} games (${ordering}, page ${page})   `)
      if (results.length < PAGE_SIZE) break
    }
  }

  const sorted = [...allNames].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
  mkdirSync(dirname(OUT_PATH), { recursive: true })
  writeFileSync(OUT_PATH, JSON.stringify(sorted, null, 2), 'utf8')
  console.log(`\nWrote ${sorted.length} games to ${OUT_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
