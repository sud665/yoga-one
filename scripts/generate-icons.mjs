import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

// PWA app icons, rendered from an SVG so they stay a source file rather than
// a binary blob nobody can edit. Replaces the flat #111111 placeholders the
// scaffold shipped with.
//
// The mark is three stacked bars of differing width: this app's centre of
// gravity is the timetable, and a row of session blocks says that far more
// honestly than a lotus would. The varying widths keep it from reading as a
// generic hamburger/list glyph, and the rounded ends echo the design
// system's own rounded-card language.
//
// Everything sits inside the middle 60% of the canvas because these are
// declared `maskable`: Android crops an installed icon to whatever shape the
// launcher uses (circle, squircle, teardrop), and only the inner ~80% is
// guaranteed to survive. Staying well inside that is what keeps the mark
// from being clipped on any launcher.
const BRAND_DEEP = '#4f6d55'
const ON_BRAND = '#ffffff'

function icon(size) {
  const unit = size / 100
  const bar = (y, width) => {
    const h = 9 * unit
    const x = 20 * unit
    return `<rect x="${x}" y="${y * unit}" width="${width * unit}" height="${h}" rx="${h / 2}" fill="${ON_BRAND}"/>`
  }

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="${BRAND_DEEP}"/>
      ${bar(31, 60)}
      ${bar(45.5, 43)}
      ${bar(60, 52)}
    </svg>`
  )
}

mkdirSync('public/icons', { recursive: true })

for (const size of [192, 512]) {
  await sharp(icon(size))
    .png()
    .toFile(`public/icons/icon-${size}.png`)
}

console.log('brand icons generated (192, 512)')
