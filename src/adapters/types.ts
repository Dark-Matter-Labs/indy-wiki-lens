/**
 * Domain types for the lens.
 *
 * `RawNode` / `RawExport` mirror the wiki export contract (schema_version 1.0)
 * EXACTLY. Everything else in this file is the lens's own domain model, derived
 * from the raw shape by src/adapters/wiki.ts. If the contract changes, only the
 * Raw* types and the mapping in wiki.ts change — no view imports Raw*.
 */

/* ---- Raw contract shape (do not use outside the adapter) ---------------- */

export type NodeType =
  | 'entity'
  | 'concept'
  | 'summary'
  | 'comparison'
  | 'overview'
  | 'synthesis'

export type Layer = 'goal' | 'portfolio' | 'mechanism' | 'sequence' | null
export type Horizon = 'near' | 'mid' | 'far' | null
export type Confidence = 'high' | 'medium' | 'low'
export type Visibility = 'public' | 'unlisted'

export interface RawNode {
  id: string
  slug: string
  title: string
  type: NodeType
  layer: Layer
  parent: string | null // parent's TITLE, not slug
  horizon: Horizon
  tags: string[]
  confidence: Confidence
  visibility: Visibility
  timestamp: string
  description: string
  sources: string[]
  body: string
  outbound_links: string[]
  inbound_links: string[]
}

export interface RawMeta {
  schema_version: string
  kind?: 'full' | 'public'
  exported_at: string
  node_count: number
  counts_by_type: Record<string, number>
  counts_by_visibility: Record<string, number>
  fixture?: boolean
}

export interface RawExport {
  meta: RawMeta
  nodes: RawNode[]
}

/* ---- Lens domain model -------------------------------------------------- */

/** Evidence honesty for axioms. Distinct from `confidence`. */
export type EvidenceStatus = 'evidenced' | 'assumptive' | 'contested'

/**
 * A rung of the QNO Knowledge Ladder
 * (https://junglepublics.github.io/dml/learning-system-v3.html), ordered by
 * epistemic maturity. The wiki has NO explicit epistemic-status field, so the
 * lens DERIVES a page's rung — see `rungFor` in the adapter. An explicit
 * epistemic tag, when present, always overrides the derivation.
 */
export type LadderRung =
  | 'assumption'
  | 'hunch'
  | 'hypothesis'
  | 'claim'
  | 'refined-claim'

/** Role of a node within the two-sided matching mechanism. */
export type MatchRole =
  | 'demand'
  | 'supply'
  | 'accelerator'
  | 'capital'
  | 'procurement'
  | null

/**
 * A wiki page, normalised for the lens. Superset of the raw node with resolved
 * relationships and lens-specific derivations pre-computed once at load.
 */
export interface Page {
  slug: string
  title: string
  type: NodeType
  layer: Layer
  horizon: Horizon
  tags: string[]
  confidence: Confidence
  visibility: Visibility
  timestamp: string
  description: string
  sources: string[]
  body: string
  outbound: string[]
  inbound: string[]

  /** Resolved from the raw `parent` TITLE → parent slug (null if unresolved). */
  parentSlug: string | null
  /** Child slugs (reverse of parentSlug), only meaningful for goal nesting. */
  childSlugs: string[]

  /** Axiom-only: honest evidence status (default 'assumptive' when unmarked). */
  evidenceStatus: EvidenceStatus | null
  /** True when this node is an axiom. */
  isAxiom: boolean
  /** Mechanism-only: side of the matching function. */
  matchRole: MatchRole
  /** Slugs of axioms this page rests on (its outbound links that are axioms). */
  restsOn: string[]
}

/** The four-step "journey" for a single page, when its body marks the steps. */
export interface Journey {
  ontologicalShift?: string
  indicators?: string
  plausibilityPathway?: string
  communication?: string
}

export interface GraphMeta {
  schemaVersion: string
  exportedAt: string
  isFixture: boolean
  nodeCount: number
}
