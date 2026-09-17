/**
 * Build-time data fetch.
 *
 * Pulls the PUBLIC wiki export (wiki.public.json) from the wiki repo's export
 * branch and writes it to public/data/wiki.json for Vite to serve statically.
 *
 * Privacy invariant (defence in depth): this script FAILS THE BUILD if any
 * fetched node carries visibility: "private". The exporter should never ship
 * one in the public file, but we verify anyway — the site must never serve a
 * private node.
 *
 * Never fetches wiki.json (the full export). Only the public path.
 */
import { writeFile, mkdir, readFile, copyFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const CONFIG = {
  repo: process.env.WIKI_REPO || 'Dark-Matter-Labs/indy-llm-wiki',
  branch: process.env.WIKI_BRANCH || 'export',
  path: process.env.WIKI_PUBLIC_PATH || 'wiki.public.json',
  token: process.env.GITHUB_TOKEN || '',
  useSample: /^(1|true|yes)$/i.test(process.env.USE_SAMPLE_DATA || ''),
}

const OUT_PATH = resolve(ROOT, 'public/data/wiki.json')
const SAMPLE_PATH = resolve(ROOT, 'public/data/wiki.sample.json')
const SUPPORTED_MAJOR = 1

/* A build running on a host, as opposed to someone's laptop.
 *
 * The distinction is the whole point of the guard in useSampleFallback: on a laptop the
 * fixture is a convenience, and on a host it is a production site quietly serving 32
 * fictional nodes under a green deploy. Netlify sets NETLIFY and CONTEXT; Vercel sets
 * VERCEL; GitHub Actions and most others set CI. */
const HOSTED = Boolean(
  process.env.NETLIFY ||
    process.env.VERCEL ||
    /^(1|true|yes)$/i.test(process.env.CI || ''),
)

function log(msg) {
  process.stdout.write(`[fetch-data] ${msg}\n`)
}

function fail(msg) {
  process.stderr.write(`[fetch-data] ERROR: ${msg}\n`)
  process.exit(1)
}

/** Fetch the raw file contents from the GitHub Contents API. */
async function fetchExport() {
  const url = `https://api.github.com/repos/${CONFIG.repo}/contents/${CONFIG.path}?ref=${CONFIG.branch}`
  const headers = {
    Accept: 'application/vnd.github.raw+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'indy-wiki-lens-build',
  }
  if (CONFIG.token) headers.Authorization = `Bearer ${CONFIG.token}`

  log(`fetching ${CONFIG.repo}@${CONFIG.branch}:${CONFIG.path}`)
  const res = await fetch(url, { headers })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(
      `GitHub responded ${res.status} ${res.statusText}. ${body.slice(0, 300)}`,
    )
  }
  return res.text()
}

/** Parse + validate schema version + enforce the privacy invariant. */
function validate(raw) {
  let data
  try {
    data = JSON.parse(raw)
  } catch (err) {
    throw new Error(`export is not valid JSON: ${err.message}`)
  }

  const version = data?.meta?.schema_version
  if (typeof version !== 'string') {
    throw new Error('export is missing meta.schema_version')
  }
  const major = Number.parseInt(version.split('.')[0], 10)
  if (major !== SUPPORTED_MAJOR) {
    throw new Error(
      `schema_version ${version} is incompatible with lens (expects major ${SUPPORTED_MAJOR}). ` +
        `Update the adapter before shipping.`,
    )
  }

  if (data?.meta?.kind && data.meta.kind !== 'public') {
    throw new Error(
      `refusing non-public export (meta.kind="${data.meta.kind}"). ` +
        `The lens must only ever load the public file.`,
    )
  }

  const nodes = Array.isArray(data.nodes) ? data.nodes : []
  const leaked = nodes.filter((n) => n?.visibility === 'private')
  if (leaked.length > 0) {
    const slugs = leaked.slice(0, 10).map((n) => n.slug || n.id).join(', ')
    throw new Error(
      `PRIVACY INVARIANT VIOLATED: ${leaked.length} node(s) with visibility:"private" ` +
        `present in the public export (${slugs}${leaked.length > 10 ? ', …' : ''}). ` +
        `The public file must never contain private nodes. Failing the build.`,
    )
  }

  return { data, nodes }
}

async function exists(p) {
  try {
    await access(p, constants.R_OK)
    return true
  } catch {
    return false
  }
}

async function useSampleFallback(reason, { deliberate = false } = {}) {
  /* The failure this closes: the token expires or gets renamed, the fetch is skipped,
   * the fixture is copied, the build exits 0, and production serves 32 fictional nodes
   * with nothing anywhere saying so. A deploy that silently swaps real data for a demo
   * is worse than a deploy that fails, so on a host it fails.
   *
   * USE_SAMPLE_DATA stays the way through, because asking for the fixture explicitly is
   * a decision somebody made rather than a default nobody noticed. */
  if (HOSTED && !deliberate) {
    fail(
      `${reason}, and this is a hosted build (${
        process.env.CONTEXT || (process.env.NETLIFY ? 'netlify' : 'ci')
      }). Refusing to publish the development fixture as if it were the wiki. ` +
        `Set GITHUB_TOKEN in the site's environment variables, or set ` +
        `USE_SAMPLE_DATA=1 if serving the demo corpus is genuinely what you want.`,
    )
  }
  if (!(await exists(SAMPLE_PATH))) {
    fail(
      `${reason} and no sample fixture at ${SAMPLE_PATH}. ` +
        `Set GITHUB_TOKEN (and WIKI_* vars) or provide the fixture.`,
    )
  }
  log(`${reason} — falling back to development fixture wiki.sample.json`)
  // Validate the fixture too: the privacy check must hold for any served data.
  const raw = await readFile(SAMPLE_PATH, 'utf8')
  validate(raw)
  await mkdir(dirname(OUT_PATH), { recursive: true })
  await copyFile(SAMPLE_PATH, OUT_PATH)
  log(`wrote ${OUT_PATH} (from fixture)`)
}

async function main() {
  await mkdir(dirname(OUT_PATH), { recursive: true })

  if (CONFIG.useSample) {
    await useSampleFallback('USE_SAMPLE_DATA is set', { deliberate: true })
    return
  }

  if (!CONFIG.token) {
    // No credentials. On a host this is now a hard error (see useSampleFallback);
    // locally we prefer the fixture so `npm run dev` works out of the box.
    await useSampleFallback('no GITHUB_TOKEN provided')
    return
  }

  let raw
  try {
    raw = await fetchExport()
  } catch (err) {
    fail(`could not fetch export: ${err.message}`)
  }

  const { data, nodes } = validate(raw)
  // Record WHERE this came from, in the data itself. archive-snapshot.mjs reads it to
  // decide whether this export belongs in this lens's history at all — without the
  // stamp a history copied from another lens is indistinguishable from an earned one,
  // which is how this lens's own series ended up in two others.
  data.meta = { ...data.meta, source_repo: CONFIG.repo, source_branch: CONFIG.branch }

  await writeFile(OUT_PATH, JSON.stringify(data), 'utf8')
  log(
    `wrote ${OUT_PATH} — ${nodes.length} node(s), exported_at ${
      data.meta?.exported_at || 'unknown'
    }`,
  )
}

main().catch((err) => fail(err.stack || String(err)))
