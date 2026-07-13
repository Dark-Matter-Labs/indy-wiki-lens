/**
 * THE data access + schema-mapping layer. Every schema assumption the lens
 * makes lives in THIS FILE. Views import the domain model (Page, WikiGraph,
 * selectors) and never touch the raw contract shape.
 *
 * If the export contract changes, or the wiki starts encoding something
 * differently (e.g. a structured evidence-status field instead of a tag), the
 * change is made here and nowhere else.
 *
 * Conventions this adapter encodes on top of the raw contract (documented so
 * the wiki team and a future maintainer can see the coupling in one place):
 *
 *  - GOAL NESTING: raw `parent` is the parent's *title*; we resolve it to a
 *    slug via a title->slug index, and compute reverse `childSlugs`.
 *  - AXIOMS: a node is an axiom if it is tagged `axiom`. Its honest evidence
 *    status comes from a `status:evidenced|assumptive|contested` tag; absent
 *    that, we default to `assumptive` (unproven until shown otherwise).
 *  - RESTS-ON: an element "rests on" any of its outbound links that resolve to
 *    an axiom node. This drives the Assumptions overlay.
 *  - MATCHING ROLES: mechanism-layer nodes carry a role via tags
 *    (`demand` | `supply` | `accelerator` | `capital` | `procurement`).
 *  - FEED: reflections/challenges are identified by slug prefix
 *    (`reflections/`, `challenges/`) or the `reflection`/`challenge` tag; the
 *    joker counterposition is the `joker` tag.
 *  - SEQUENCE DEPENDENCIES: the graph only has generic links, so we treat a
 *    link from an earlier-horizon node to a later-horizon node as an asserted
 *    forward dependency, and draw only those.
 */
import type {
  EvidenceStatus,
  GraphMeta,
  Horizon,
  Journey,
  MatchRole,
  Page,
  RawExport,
  RawNode,
} from './types'

const DATA_URL = `${import.meta.env.BASE_URL}data/wiki.json`
const SUPPORTED_MAJOR = 1

const HORIZON_ORDER: Record<Exclude<Horizon, null>, number> = {
  near: 0,
  mid: 1,
  far: 2,
}

/* ---- normalisation ------------------------------------------------------ */

function evidenceFromTags(tags: string[]): EvidenceStatus | null {
  const statusTag = tags.find((t) => t.startsWith('status:'))
  if (statusTag) {
    const v = statusTag.slice('status:'.length) as EvidenceStatus
    if (v === 'evidenced' || v === 'assumptive' || v === 'contested') return v
  }
  // Axioms with no explicit status are honestly shown as assumptive.
  return null
}

function matchRoleFromTags(tags: string[]): MatchRole {
  if (tags.includes('demand')) return 'demand'
  if (tags.includes('supply')) return 'supply'
  if (tags.includes('accelerator')) return 'accelerator'
  if (tags.includes('capital')) return 'capital'
  if (tags.includes('procurement')) return 'procurement'
  return null
}

function toPage(raw: RawNode, titleToSlug: Map<string, string>): Page {
  const isAxiom = raw.tags.includes('axiom')
  const evidence = isAxiom ? (evidenceFromTags(raw.tags) ?? 'assumptive') : null
  return {
    slug: raw.slug,
    title: raw.title,
    type: raw.type,
    layer: raw.layer,
    horizon: raw.horizon,
    tags: raw.tags,
    confidence: raw.confidence,
    visibility: raw.visibility,
    timestamp: raw.timestamp,
    description: raw.description,
    sources: raw.sources ?? [],
    body: raw.body ?? '',
    outbound: raw.outbound_links ?? [],
    inbound: raw.inbound_links ?? [],
    parentSlug: raw.parent ? (titleToSlug.get(raw.parent) ?? null) : null,
    childSlugs: [],
    evidenceStatus: evidence,
    isAxiom,
    matchRole: raw.layer === 'mechanism' ? matchRoleFromTags(raw.tags) : null,
    restsOn: [], // filled after all pages exist (needs axiom set)
  }
}

/* ---- the graph ---------------------------------------------------------- */

export class WikiGraph {
  readonly meta: GraphMeta
  private readonly bySlug: Map<string, Page>
  private readonly byTitle: Map<string, string>
  readonly pages: Page[]

  private constructor(meta: GraphMeta, pages: Page[]) {
    this.meta = meta
    this.pages = pages
    this.bySlug = new Map(pages.map((p) => [p.slug, p]))
    this.byTitle = new Map(pages.map((p) => [p.title, p.slug]))
  }

  /** Resolve a page title to its slug (for [[wiki-link]] rendering). */
  slugForTitle(title: string): string | undefined {
    return this.byTitle.get(title)
  }

  static fromExport(data: RawExport): WikiGraph {
    const major = Number.parseInt(
      (data.meta?.schema_version ?? '0').split('.')[0],
      10,
    )
    if (major !== SUPPORTED_MAJOR) {
      throw new SchemaMismatchError(data.meta?.schema_version ?? 'unknown')
    }

    const raw = data.nodes ?? []
    const titleToSlug = new Map<string, string>()
    for (const n of raw) titleToSlug.set(n.title, n.slug)

    const pages = raw.map((n) => toPage(n, titleToSlug))
    const bySlug = new Map(pages.map((p) => [p.slug, p]))
    const axiomSlugs = new Set(pages.filter((p) => p.isAxiom).map((p) => p.slug))

    // Second pass: children (goal nesting) and rests-on (axiom edges).
    for (const p of pages) {
      if (p.parentSlug) {
        const parent = bySlug.get(p.parentSlug)
        if (parent) parent.childSlugs.push(p.slug)
      }
      p.restsOn = p.outbound.filter((s) => axiomSlugs.has(s))
    }

    const meta: GraphMeta = {
      schemaVersion: data.meta.schema_version,
      exportedAt: data.meta.exported_at,
      isFixture: Boolean(data.meta.fixture),
      nodeCount: pages.length,
    }
    return new WikiGraph(meta, pages)
  }

  get(slug: string): Page | undefined {
    return this.bySlug.get(slug)
  }

  many(slugs: string[]): Page[] {
    return slugs.map((s) => this.bySlug.get(s)).filter((p): p is Page => !!p)
  }

  /** Pages eligible for navigation, search and sitemap (excludes unlisted). */
  get listable(): Page[] {
    return this.pages.filter((p) => p.visibility !== 'unlisted')
  }

  /* ---- view selectors -------------------------------------------------- */

  goals(): Page[] {
    return this.pages.filter((p) => p.layer === 'goal')
  }

  /** Root goals (no resolved parent). */
  rootGoals(): Page[] {
    return this.goals().filter((g) => !g.parentSlug)
  }

  children(slug: string): Page[] {
    const p = this.bySlug.get(slug)
    return p ? this.many(p.childSlugs) : []
  }

  /** Breadcrumb from root down to the given goal (inclusive). */
  goalPath(slug: string): Page[] {
    const path: Page[] = []
    let cur = this.bySlug.get(slug)
    const seen = new Set<string>()
    while (cur && !seen.has(cur.slug)) {
      seen.add(cur.slug)
      path.unshift(cur)
      cur = cur.parentSlug ? this.bySlug.get(cur.parentSlug) : undefined
    }
    return path
  }

  portfolio(): Page[] {
    return this.pages.filter((p) => p.layer === 'portfolio')
  }

  /** Portfolio items that address a given goal (link either direction). */
  portfolioForGoal(goalSlug: string): Page[] {
    return this.portfolio().filter(
      (p) => p.outbound.includes(goalSlug) || p.inbound.includes(goalSlug),
    )
  }

  /** Goals a portfolio item addresses. */
  goalsForPortfolio(slug: string): Page[] {
    const p = this.bySlug.get(slug)
    if (!p) return []
    const goalSet = new Set(this.goals().map((g) => g.slug))
    return this.many(
      [...new Set([...p.outbound, ...p.inbound])].filter((s) => goalSet.has(s)),
    )
  }

  mechanisms(): Page[] {
    return this.pages.filter((p) => p.layer === 'mechanism')
  }

  matching(): {
    demand: Page[]
    supply: Page[]
    accelerator: Page | undefined
    capital: Page | undefined
    procurement: Page | undefined
  } {
    const mech = this.mechanisms()
    return {
      demand: mech.filter((p) => p.matchRole === 'demand'),
      supply: mech.filter((p) => p.matchRole === 'supply'),
      accelerator: mech.find((p) => p.matchRole === 'accelerator'),
      capital: mech.find((p) => p.matchRole === 'capital'),
      procurement: mech.find((p) => p.matchRole === 'procurement'),
    }
  }

  axioms(): Page[] {
    return this.pages.filter((p) => p.isAxiom)
  }

  /** Everything downstream of an axiom: pages that rest on it (transitively). */
  downstreamOf(axiomSlug: string): Set<string> {
    const out = new Set<string>()
    const stack = [axiomSlug]
    while (stack.length) {
      const cur = stack.pop() as string
      for (const p of this.pages) {
        if (p.restsOn.includes(cur) && !out.has(p.slug)) {
          out.add(p.slug)
          stack.push(p.slug) // a page resting on this may be rested-on in turn
        }
      }
    }
    return out
  }

  /* ---- sequence -------------------------------------------------------- */

  /** Pages placed in horizon lanes (only those with a horizon set). */
  horizonLanes(): Record<Exclude<Horizon, null>, Page[]> {
    const lanes: Record<Exclude<Horizon, null>, Page[]> = {
      near: [],
      mid: [],
      far: [],
    }
    for (const p of this.pages) {
      if (p.horizon) lanes[p.horizon].push(p)
    }
    return lanes
  }

  /** Forward dependency edges: earlier-horizon -> later-horizon asserted links. */
  sequenceEdges(): Array<{ from: string; to: string }> {
    const edges: Array<{ from: string; to: string }> = []
    for (const p of this.pages) {
      if (!p.horizon) continue
      for (const t of p.outbound) {
        const tgt = this.bySlug.get(t)
        if (!tgt || !tgt.horizon) continue
        if (HORIZON_ORDER[p.horizon] < HORIZON_ORDER[tgt.horizon]) {
          edges.push({ from: p.slug, to: t })
        }
      }
    }
    return edges
  }

  /* ---- feed ------------------------------------------------------------ */

  reflections(): Page[] {
    return this.pages
      .filter(
        (p) =>
          p.slug.startsWith('reflections/') || p.tags.includes('reflection'),
      )
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }

  challenges(): Page[] {
    return this.pages
      .filter(
        (p) => p.slug.startsWith('challenges/') || p.tags.includes('challenge'),
      )
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }

  /** Combined feed, newest first. Challenges flagged as joker where tagged. */
  feed(): Array<{ page: Page; kind: 'reflection' | 'challenge'; joker: boolean }> {
    const items = [
      ...this.reflections().map((page) => ({
        page,
        kind: 'reflection' as const,
        joker: false,
      })),
      ...this.challenges().map((page) => ({
        page,
        kind: 'challenge' as const,
        joker: page.tags.includes('joker'),
      })),
    ]
    return items.sort((a, b) => b.page.timestamp.localeCompare(a.page.timestamp))
  }

  /* ---- search ---------------------------------------------------------- */

  /** Simple case-insensitive search over listable titles + descriptions. */
  search(query: string, limit = 20): Page[] {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const scored: Array<{ p: Page; score: number }> = []
    for (const p of this.listable) {
      const title = p.title.toLowerCase()
      const desc = p.description.toLowerCase()
      let score = 0
      if (title === q) score = 100
      else if (title.startsWith(q)) score = 60
      else if (title.includes(q)) score = 40
      else if (desc.includes(q)) score = 20
      else if (p.tags.some((t) => t.toLowerCase().includes(q))) score = 10
      if (score > 0) scored.push({ p, score })
    }
    return scored
      .sort((a, b) => b.score - a.score || a.p.title.localeCompare(b.p.title))
      .slice(0, limit)
      .map((s) => s.p)
  }
}

/* ---- journey parsing (secondary axiom mode) ----------------------------- */

const JOURNEY_HEADINGS: Array<{ key: keyof Journey; patterns: RegExp[] }> = [
  { key: 'ontologicalShift', patterns: [/ontological shift/i, /^shift$/i] },
  {
    key: 'indicators',
    patterns: [/what it (?:practically )?means/i, /indicators?/i],
  },
  { key: 'plausibilityPathway', patterns: [/plausibility pathway/i, /pathway/i] },
  { key: 'communication', patterns: [/communication/i, /how (?:we|to) say/i] },
]

/**
 * Parse the four journey steps from a page body, if it marks them as headings.
 * Returns null when the body doesn't structure itself this way, so callers can
 * degrade gracefully to the plain body.
 */
export function parseJourney(body: string): Journey | null {
  const lines = body.split('\n')
  const sections: Array<{ heading: string; content: string[] }> = []
  let current: { heading: string; content: string[] } | null = null
  for (const line of lines) {
    const m = /^#{1,6}\s+(.*)$/.exec(line)
    if (m) {
      current = { heading: m[1].trim(), content: [] }
      sections.push(current)
    } else if (current) {
      current.content.push(line)
    }
  }

  const journey: Journey = {}
  for (const section of sections) {
    for (const { key, patterns } of JOURNEY_HEADINGS) {
      if (journey[key]) continue
      if (patterns.some((re) => re.test(section.heading))) {
        journey[key] = section.content.join('\n').trim()
      }
    }
  }
  const hasAny = Object.values(journey).some((v) => v && v.length > 0)
  return hasAny ? journey : null
}

/* ---- loading ------------------------------------------------------------ */

export class SchemaMismatchError extends Error {
  constructor(version: string) {
    super(
      `Wiki export schema_version "${version}" is not compatible with this lens ` +
        `(expects major ${SUPPORTED_MAJOR}).`,
    )
    this.name = 'SchemaMismatchError'
  }
}

let cached: Promise<WikiGraph> | null = null

/** Load and parse the public export. Cached for the session. */
export function loadGraph(): Promise<WikiGraph> {
  if (!cached) {
    cached = fetch(DATA_URL)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load wiki data (${res.status})`)
        }
        return res.json() as Promise<RawExport>
      })
      .then((data) => WikiGraph.fromExport(data))
      .catch((err) => {
        cached = null // allow retry
        throw err
      })
  }
  return cached
}

export const HORIZON_LABELS: Record<Exclude<Horizon, null>, string> = {
  near: 'Near',
  mid: 'Mid',
  far: 'Far',
}
