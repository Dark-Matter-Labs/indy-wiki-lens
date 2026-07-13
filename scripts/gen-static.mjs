/**
 * Emits sitemap.xml and robots.txt from the fetched public export.
 *
 * Privacy: unlisted pages are EXCLUDED from the sitemap (they render at their
 * URL but must not be advertised to indexers — matching the noindex meta the
 * app sets on them). Only visibility:"public" pages are listed. Runs after
 * fetch-data.mjs in the prebuild step.
 */
import { readFile, writeFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DATA = resolve(ROOT, 'public/data/wiki.json')

// Absolute base URL for sitemap entries. Netlify exposes the deploy URL as URL.
const SITE_URL = (process.env.SITE_URL || process.env.URL || '').replace(/\/$/, '')

const VIEW_ROUTES = ['/', '/goals', '/portfolio', '/how', '/sequence', '/feed', '/axioms']

function log(m) {
  process.stdout.write(`[gen-static] ${m}\n`)
}

async function main() {
  try {
    await access(DATA, constants.R_OK)
  } catch {
    log('no data file; skipping sitemap/robots')
    return
  }

  const data = JSON.parse(await readFile(DATA, 'utf8'))
  const nodes = Array.isArray(data.nodes) ? data.nodes : []
  const publicPages = nodes.filter((n) => n.visibility === 'public')

  // robots.txt — allow indexing; point at sitemap when we know the origin.
  const robots = [
    'User-agent: *',
    'Allow: /',
    SITE_URL ? `Sitemap: ${SITE_URL}/sitemap.xml` : '',
    '',
  ].join('\n')
  await writeFile(resolve(ROOT, 'public/robots.txt'), robots, 'utf8')

  if (!SITE_URL) {
    log('SITE_URL/URL not set — wrote robots.txt without a Sitemap line, skipping sitemap.xml')
    return
  }

  const urls = [
    ...VIEW_ROUTES.map((r) => ({ loc: `${SITE_URL}${r}` })),
    ...publicPages.map((p) => ({
      loc: `${SITE_URL}/p/${encodeURI(p.slug)}`,
      lastmod: p.timestamp,
    })),
  ]

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (u) =>
        `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`,
    ),
    '</urlset>',
    '',
  ].join('\n')

  await writeFile(resolve(ROOT, 'public/sitemap.xml'), xml, 'utf8')
  log(`wrote sitemap.xml (${urls.length} urls; ${publicPages.length} public pages, unlisted excluded)`)
}

main().catch((err) => {
  process.stderr.write(`[gen-static] ERROR: ${err.stack || err}\n`)
  process.exit(1)
})
