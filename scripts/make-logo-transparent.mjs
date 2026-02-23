import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const logoPath = join(__dirname, '..', 'public', 'gameratez-logo.png')

// Load image and get raw RGBA data
const image = sharp(logoPath)
const { data, info } = await image.raw().ensureAlpha().toBuffer({ resolveWithObject: true })
const { width, height, channels } = info

// Make pixels that are very dark (black background) transparent
const threshold = 35 // pixels with r,g,b all below this become transparent
for (let i = 0; i < data.length; i += channels) {
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]
  if (r <= threshold && g <= threshold && b <= threshold) {
    data[i + 3] = 0 // set alpha to 0
  }
}

await sharp(data, { raw: { width, height, channels } })
  .png()
  .toFile(logoPath)

console.log('Logo background made transparent:', logoPath)
