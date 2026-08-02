import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

mkdirSync('public/icons', { recursive: true })

for (const size of [192, 512]) {
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 17, g: 17, b: 17, alpha: 1 },
    },
  })
    .png()
    .toFile(`public/icons/icon-${size}.png`)
}

console.log('placeholder icons generated — replace with real branding before launch')
