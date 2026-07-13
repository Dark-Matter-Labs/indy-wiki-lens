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
  path: process.env.WIKI_PUBLIC_PATH || 'export/wiki.public.json',
  token: process.env.GITHUB_TOKEN || '',
  useSample: /^(1|true|yes)$/i.test(process.env.USE_SAMPLE_DATA || ''),
}

const OUT_PATH = resolve(ROOT, 'public/data/wiki.json')
const SAMPLE_PATH = resolve(ROOT, 'public/data/wiki.sample.json')
const SUPPORTED_MAJOR = 1

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

async function useSampleFallback(reason) {
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
    await useSampleFallback('USE_SAMPLE_DATA is set')
    return
  }

  if (!CONFIG.token) {
    // No credentials. In production this should be a hard error; locally we
    // prefer the fixture so `npm run dev` works out of the box.
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
  await writeFile(OUT_PATH, JSON.stringify(data), 'utf8')
  log(
    `wrote ${OUT_PATH} — ${nodes.length} node(s), exported_at ${
      data.meta?.exported_at || 'unknown'
    }`,
  )
}

main().catch((err) => fail(err.stack || String(err)))
