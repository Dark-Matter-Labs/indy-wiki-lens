/**
 * Snapshot archiver — the SOLE digester for the trajectory instrument.
 *
 * Reads the fetched public export (public/data/wiki.json, written by
 * fetch-data.mjs) and appends a compact, privacy-safe DIGEST of it to
 * public/data/history.json. Over successive runs this file accumulates the
 * series of snapshots the Observatory's Trajectory panel reads to show motion
 * over time (src/adapters/trajectory.ts consumes what this writes).
 *
 * What it stores: aggregate counts, normalised category fractions, and the
 * top-14 gravity-centre slugs — all derived from the PUBLIC export. No titles,
 * prose, descriptions, or private data. It re-runs the privacy guard and skips
 * development fixtures, so it never pollutes real history nor leaks content.
 *
 * Idempotent: dedupes by content hash, so re-running on an unchanged export is
 * a no-op (and the CI job commits nothing).
 *
 * Usage: node scripts/archive-snapshot.mjs [exportPath] [historyPath]
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const EXPORT_PATH = resolve(ROOT, process.argv[2] || 'public/data/wiki.json')
const HISTORY_PATH = resolve(ROOT, process.argv[3] || 'public/data/history.json')
const CENTER_COUNT = 14
const HISTORY_SCHEMA = 1

function log(msg) {
  process.stdout.write(`[archive-snapshot] ${msg}\n`)
}
function fail(msg) {
  process.stderr.write(`[archive-snapshot] ERROR: ${msg}\n`)
  process.exit(1)
}

/** Same privacy posture as fetch-data: never digest non-public or private data. */
function guard(data) {
  if (data?.meta?.kind && data.meta.kind !== 'public') {
    fail(`refusing non-public export (meta.kind="${data.meta.kind}").`)
  }
  const nodes = Array.isArray(data.nodes) ? data.nodes : []
  const leaked = nodes.filter((n) => n?.visibility === 'private')
  if (leaked.length > 0) {
    fail(`PRIVACY: ${leaked.length} private node(s) in the export — refusing to digest.`)
  }
  return nodes
}

function digest(data, raw) {
  const nodes = guard(data)
  const pages = nodes.length

  let links = 0
  let totalDegree = 0
  let axioms = 0
  const tagSet = new Set()
  const counts = { type: {}, layer: {}, conf: {}, hz: {} }
  const degrees = []

  for (const n of nodes) {
    const out = (n.outbound_links || []).length
    const inb = (n.inbound_links || []).length
    links += out
    totalDegree += out + inb
    degrees.push({ slug: n.slug, degree: out + inb })
    for (const t of n.tags || []) tagSet.add(t)
    if ((n.tags || []).includes('axiom')) axioms++
    bump(counts.type, n.type || 'unknown')
    bump(counts.layer, n.layer || 'unassigned')
    bump(counts.conf, n.confidence || 'unknown')
    bump(counts.hz, n.horizon || 'none')
  }

  // Normalised feature vector: fractions within each category, prefixed keys.
  const vec = {}
  for (const [group, table] of Object.entries(counts)) {
    for (const [key, count] of Object.entries(table)) {
      vec[`${group}:${key}`] = pages ? count / pages : 0
    }
  }

  const centers = degrees
    .filter((d) => d.degree > 0)
    .sort((a, b) => b.degree - a.degree)
    .slice(0, CENTER_COUNT)
    .map((d) => d.slug)

  return {
    at: new Date().toISOString(),
    exportedAt: data?.meta?.exported_at || '',
    hash: createHash('sha256').update(raw).digest('hex').slice(0, 16),
    pages,
    links,
    tags: tagSet.size,
    axioms,
    avgDegree: pages ? Number((totalDegree / pages).toFixed(3)) : 0,
    vec,
    centers,
  }
}

function bump(table, key) {
  table[key] = (table[key] || 0) + 1
}

async function readHistory() {
  try {
    const parsed = JSON.parse(await readFile(HISTORY_PATH, 'utf8'))
    if (parsed && Array.isArray(parsed.snapshots)) return parsed
  } catch {
    /* missing or invalid — start fresh */
  }
  return { schema: HISTORY_SCHEMA, snapshots: [] }
}

async function main() {
  let raw
  try {
    raw = await readFile(EXPORT_PATH, 'utf8')
  } catch {
    fail(`no export at ${EXPORT_PATH}. Run scripts/fetch-data.mjs first.`)
  }

  let data
  try {
    data = JSON.parse(raw)
  } catch (err) {
    fail(`export is not valid JSON: ${err.message}`)
  }

  if (data?.meta?.fixture) {
    log('export is a development fixture — not archiving (real history only).')
    return
  }

  const snap = digest(data, raw)
  const history = await readHistory()
  const last = history.snapshots[history.snapshots.length - 1]

  if (last && last.hash === snap.hash) {
    log(`unchanged (hash ${snap.hash}) — history has ${history.snapshots.length} snapshot(s), nothing to add.`)
    return
  }

  history.schema = HISTORY_SCHEMA
  history.snapshots.push(snap)
  await mkdir(dirname(HISTORY_PATH), { recursive: true })
  await writeFile(HISTORY_PATH, `${JSON.stringify(history, null, 2)}\n`, 'utf8')
  log(
    `archived snapshot ${snap.hash} (exported ${snap.exportedAt || 'unknown'}, ` +
      `${snap.pages} pages) — history now has ${history.snapshots.length} snapshot(s).`,
  )
}

main().catch((err) => fail(err.stack || String(err)))
