/**
 * Observatory — derives "state of the wiki" vital signs from a single export
 * snapshot. Pure aggregation over the domain model (no schema mapping; that
 * lives in wiki.ts). The view renders whatever this returns.
 *
 * HONEST LIMIT: this reads ONE snapshot. It can show scale, structure, and the
 * cadence implied by each page's `timestamp` (when it was last touched). It
 * CANNOT show a true trajectory / centre-of-mass motion the way Indy's
 * "repository gravity" instrument does — that needs a series of version-control
 * snapshots over time. What we call "gravity" here is the STATIC analog: where
 * the corpus's mass concentrates right now, measured by link centrality. The
 * moment the lens archives successive exports, this same view can plot motion.
 */
import type { WikiGraph } from './wiki'
import type {
  Confidence,
  EvidenceStatus,
  NodeType,
  Page,
} from './types'

export interface DayBucket {
  date: string
  count: number
}

export interface GravityCenter {
  page: Page
  inbound: number
  outbound: number
  degree: number
}

export interface Observatory {
  counts: {
    pages: number
    unlisted: number
    links: number
    tags: number
    sources: number
    axioms: number
    withSources: number
    byType: Array<{ key: NodeType; count: number }>
    byLayer: Array<{ key: string; count: number }>
    byHorizon: Array<{ key: string; count: number }>
    byConfidence: Array<{ key: Confidence; count: number }>
    byEvidence: Array<{ key: EvidenceStatus; count: number }>
  }
  cadence: {
    exportedAt: string
    first: string | null
    last: string | null
    spanDays: number
    byDay: DayBucket[]
    peak: number
    freshest: Page[]
    stalest: Page[]
  }
  gravity: {
    centers: GravityCenter[]
    avgDegree: number
    orphans: number
    maxDegree: number
  }
  axiomLoad: Array<{ axiom: Page; dependents: number }>
}

const day = (ts: string): string => (ts ? ts.slice(0, 10) : '')

/** A Substack essay — its own body of writing, not a curated-lens page. */
const isEssay = (p: Page): boolean =>
  p.tags.includes('substack') || p.slug.startsWith('substack-')

/** Inclusive list of ISO dates from a→b (both YYYY-MM-DD). */
function dateRange(a: string, b: string): string[] {
  const out: string[] = []
  const start = new Date(`${a}T00:00:00Z`)
  const end = new Date(`${b}T00:00:00Z`)
  for (let d = start; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

function tally<T extends string>(
  pages: Page[],
  pick: (p: Page) => T,
  labels?: Record<string, string>,
): Array<{ key: T; count: number }> {
  const m = new Map<T, number>()
  for (const p of pages) {
    const k = pick(p)
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()]
    .map(([key, count]) => ({ key: (labels?.[key] ?? key) as T, count }))
    .sort((a, b) => b.count - a.count)
}

export function computeObservatory(graph: WikiGraph): Observatory {
  const pages = graph.pages

  // ---- counts --------------------------------------------------------------
  const links = pages.reduce((n, p) => n + p.outbound.length, 0)
  const tagSet = new Set<string>()
  let sources = 0
  let withSources = 0
  for (const p of pages) {
    for (const t of p.tags) tagSet.add(t)
    sources += p.sources.length
    if (p.sources.length > 0) withSources++
  }
  const axioms = graph.axioms()

  const byEvidence = axioms.reduce<Record<string, number>>((m, a) => {
    const k = a.evidenceStatus ?? 'assumptive'
    m[k] = (m[k] ?? 0) + 1
    return m
  }, {})

  // ---- cadence -------------------------------------------------------------
  const days = pages.map((p) => day(p.timestamp)).filter(Boolean).sort()
  const first = days[0] ?? null
  const last = days[days.length - 1] ?? null
  const dayCount = new Map<string, number>()
  for (const d of days) dayCount.set(d, (dayCount.get(d) ?? 0) + 1)
  const byDay: DayBucket[] =
    first && last
      ? dateRange(first, last).map((date) => ({
          date,
          count: dayCount.get(date) ?? 0,
        }))
      : []
  const peak = byDay.reduce((m, b) => Math.max(m, b.count), 0)
  const spanDays = byDay.length
  const byTime = [...pages]
    .filter((p) => p.timestamp)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  const freshest = byTime.slice(0, 5)
  const stalest = byTime.slice(-5).reverse()

  // ---- gravity (static centre of mass, by link centrality) -----------------
  const centers: GravityCenter[] = pages
    .map((p) => ({
      page: p,
      inbound: p.inbound.length,
      outbound: p.outbound.length,
      degree: p.inbound.length + p.outbound.length,
    }))
    .filter((c) => c.degree > 0)
    .sort((a, b) => b.degree - a.degree)
  const totalDegree = pages.reduce(
    (n, p) => n + p.inbound.length + p.outbound.length,
    0,
  )
  const orphans = pages.filter(
    (p) => p.inbound.length === 0 && p.outbound.length === 0,
  ).length

  // ---- axiom load ----------------------------------------------------------
  const axiomLoad = axioms
    .map((axiom) => ({ axiom, dependents: graph.downstreamOf(axiom.slug).size }))
    .sort((a, b) => b.dependents - a.dependents)

  return {
    counts: {
      pages: pages.length,
      unlisted: pages.filter((p) => p.visibility === 'unlisted').length,
      links,
      tags: tagSet.size,
      sources,
      axioms: axioms.length,
      withSources,
      byType: tally<NodeType>(pages, (p) => p.type),
      // `layer` is a deliberately sparse curated overlay (the four lens views), not
      // a universal classifier. Rather than collapse everything else into one
      // "unassigned" bucket, name what those pages actually are: the Substack
      // essays are their own body of writing, and the small remainder is the
      // general library not (yet) placed in a lens.
      byLayer: tally(pages, (p) =>
        p.layer ?? (isEssay(p) ? 'essays' : 'library'),
      ),
      byHorizon: tally(pages, (p) => (p.horizon ?? 'none') as string),
      byConfidence: tally<Confidence>(pages, (p) => p.confidence),
      byEvidence: Object.entries(byEvidence)
        .map(([key, count]) => ({ key: key as EvidenceStatus, count }))
        .sort((a, b) => b.count - a.count),
    },
    cadence: {
      exportedAt: graph.meta.exportedAt,
      first,
      last,
      spanDays,
      byDay,
      peak,
      freshest,
      stalest,
    },
    gravity: {
      centers: centers.slice(0, 14),
      avgDegree: pages.length ? totalDegree / pages.length : 0,
      orphans,
      maxDegree: centers[0]?.degree ?? 0,
    },
    axiomLoad,
  }
}
