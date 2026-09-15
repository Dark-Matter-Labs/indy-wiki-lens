#!/usr/bin/env node
/**
 * PHANTOM CLASS GUARD — fails the build when a colour utility in src/ produces
 * no CSS rule at all.
 *
 * Why this exists: tailwind.config.js maps every colour to a CSS custom
 * property holding a hex value (`accent: 'var(--color-accent)'`). Tailwind
 * cannot apply an alpha modifier to that — `<alpha-value>` has nowhere to go —
 * so `bg-accent/5` is silently DROPPED from the output. No warning, no error,
 * no rule: the element just renders with no background. The same silence
 * swallows a colour that does not exist in the palette (`bg-paper`,
 * `text-muted`). Ten alpha classes and two unknown colours shipped this way
 * before anyone noticed, because reading the source tells you nothing.
 *
 * So this checks the BUILT CSS, not the source. Every colour-utility class
 * found in src/ must have a matching selector in dist/. If it does not, the
 * class is dead and this fails.
 *
 * Usage: node scripts/check-classes.mjs [distDir]   (default: dist)
 * Run it AFTER a build.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const DIST = process.argv[2] ?? 'dist'

/** Utility prefixes whose value is a colour. Some share their namespace with
 *  non-colour values (`text-sm`, `border-t`) — those resolve fine and pass. */
const PREFIXES = ['bg', 'text', 'border', 'ring', 'fill', 'stroke', 'divide', 'outline']

/** Optional variant chain (`hover:`, `group-hover:`, `md:`, `dark:`…) followed
 *  by the utility. Variants are part of the generated selector, so they must be
 *  captured — `.hover\:text-accent-bright:hover` does not contain
 *  `.text-accent-bright`. */
const CANDIDATE = new RegExp(
  String.raw`(?:[a-z][a-z0-9-]*:)*(?:${PREFIXES.join('|')})-[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\/\d{1,3})?`,
  'g',
)

/** Real CSS property names that collide with a utility prefix. They turn up in
 *  inline <style> template literals and in `transition:` values, where nothing
 *  syntactic distinguishes them from a class name. */
const CSS_PROPERTY_LOOKALIKES = new Set([
  'background-attachment', 'background-clip', 'background-color', 'background-image',
  'background-origin', 'background-position', 'background-repeat', 'background-size',
  'border-bottom', 'border-collapse', 'border-color', 'border-left', 'border-radius',
  'border-right', 'border-spacing', 'border-style', 'border-top', 'border-width',
  'fill-opacity', 'fill-rule', 'outline-color', 'outline-offset', 'outline-style',
  'outline-width', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap',
  'stroke-linejoin', 'stroke-opacity', 'stroke-width', 'text-align', 'text-anchor',
  'text-decoration', 'text-indent', 'text-overflow', 'text-rendering', 'text-shadow',
  'text-transform', 'text-underline-offset', 'text-wrap',
])

function walk(dir) {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (['.ts', '.tsx', '.js', '.jsx'].includes(extname(e.name))) out.push(p)
  }
  return out
}

function collectCss(dir) {
  if (!existsSync(dir)) return null
  let css = ''
  const stack = [dir]
  while (stack.length) {
    const d = stack.pop()
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name)
      if (e.isDirectory()) stack.push(p)
      else if (extname(e.name) === '.css') css += readFileSync(p, 'utf8')
    }
  }
  return css
}

const css = collectCss(DIST)
if (css === null) {
  console.error(
    `check-classes: no ${DIST}/ directory. Build first:\n` +
      `  ./node_modules/.bin/tsc -b && ./node_modules/.bin/vite build`,
  )
  process.exit(2)
}
if (!css) {
  console.error(`check-classes: no .css files under ${DIST}/ — nothing to check against.`)
  process.exit(2)
}

// Tailwind escapes "/", ":", "." and brackets in the emitted selector —
// `.bg-accent\/5`, `.hover\:text-accent-bright:hover`.
const selectorFor = (cls) => '.' + cls.replace(/([/:.[\]])/g, '\\$1')

const missing = new Map() // class -> Set<file:line>

for (const file of walk('src')) {
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    for (const m of line.matchAll(CANDIDATE)) {
      const cls = m[0]
      if (CSS_PROPERTY_LOOKALIKES.has(cls)) continue
      // A CSS declaration, not a class: `border-radius: 6px`, `fill="…"`.
      const after = line.slice(m.index + cls.length)
      if (/^\s*=/.test(after)) continue
      // Skip custom-property references: var(--color-…), --text-sm, etc.
      const before = line.slice(0, m.index)
      if (/(--|var\(\s*--)[a-z-]*$/.test(before)) continue
      if (css.includes(selectorFor(cls))) continue
      if (!missing.has(cls)) missing.set(cls, new Set())
      missing.get(cls).add(`${file}:${i + 1}`)
    }
  })
}

if (missing.size === 0) {
  console.log('check-classes: every colour utility in src/ resolves to a rule in the built CSS.')
  process.exit(0)
}

console.error(
  `\ncheck-classes: ${missing.size} class(es) in src/ produce NO CSS rule.\n` +
    `These render as nothing. Two usual causes:\n` +
    `  • an alpha modifier on a token colour (bg-accent/5) — tailwind.config.js maps\n` +
    `    colours to hex-valued custom properties, which cannot take an <alpha-value>.\n` +
    `    Add an explicit rgba token in src/theme/tokens.css instead (see --color-accent-wash).\n` +
    `  • a colour that is not in the palette (bg-paper) — check tailwind.config.js.\n`,
)
for (const [cls, where] of [...missing].sort()) {
  console.error(`  ${cls.padEnd(26)} ${[...where].join(' ')}`)
}
console.error('')
process.exit(1)
