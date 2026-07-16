/**
 * Trajectory — turns a series of archived export digests into motion metrics,
 * the read-side of Indy's "repository gravity". Pure: it consumes the digests
 * written by scripts/archive-snapshot.mjs (the sole digester) and never touches
 * the raw export itself, so the app carries no snapshot-building logic.
 *
 * A digest's `vec` is a bag of normalised feature fractions ({ "type:summary":
 * 0.25, "layer:goal": 0.18, … }). Distance between two snapshots is the
 * Euclidean distance over the union of their keys — order-free, robust to the
 * feature set drifting over time. From that we derive:
 *   • displacement   — how far the corpus's shape moved between two exports
 *   • persistence    — cosine of successive move vectors (is it holding a heading)
 *   • growth         — Δ page count
 *   • centreTurnover — 1 − Jaccard of the gravity centres (is the core shifting)
 *
 * Honest limit: we cannot measure provenance, so we do NOT claim Indy's
 * "unmoored" / "captured" modes (those need edit-level attribution the export
 * lacks). We report what motion we can see, and say when there is not enough
 * history yet.
 */

export interface SnapshotDigest {
  /** ISO time the snapshot was archived. */
  at: string
  /** The export's own meta.exported_at. */
  exportedAt: string
  /** Content hash of the export (dedupe key). */
  hash: string
  pages: number
  links: number
  tags: number
  axioms: number
  avgDegree: number
  /** Normalised feature fractions, e.g. { "type:summary": 0.25 }. */
  vec: Record<string, number>
  /** Top gravity-centre slugs by degree (public slugs only). */
  centers: string[]
}

export interface SnapshotHistory {
  schema: number
  snapshots: SnapshotDigest[]
}

export interface Leg {
  fromDate: string
  toDate: string
  displacement: number
  growth: number
  centreTurnover: number
  /** Cosine of this move vs the previous move; null on the first leg. */
  persistence: number | null
}

export type Health = 'moving' | 'stuck' | 'accelerating'

export interface Trajectory {
  legs: Leg[]
  peakDisplacement: number
  span: { first: string; last: string } | null
  latest: { health: Health; note: string } | null
}

/** Displacement threshold below which a leg counts as "not really moving". */
const STILL = 0.01

function dictDistance(a: Record<string, number>, b: Record<string, number>): number {
  let sum = 0
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const d = (a[k] ?? 0) - (b[k] ?? 0)
    sum += d * d
  }
  return Math.sqrt(sum)
}

function dictDelta(
  a: Record<string, number>,
  b: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    out[k] = (b[k] ?? 0) - (a[k] ?? 0)
  }
  return out
}

function cosine(a: Record<string, number>, b: Record<string, number>): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k] ?? 0
    const y = b[k] ?? 0
    dot += x * y
    na += x * x
    nb += y * y
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1
  const sa = new Set(a)
  const sb = new Set(b)
  let inter = 0
  for (const x of sa) if (sb.has(x)) inter++
  const union = new Set([...a, ...b]).size
  return union === 0 ? 1 : inter / union
}

const shortDate = (iso: string): string => (iso ? iso.slice(0, 10) : '')

export function computeTrajectory(history: SnapshotHistory | null): Trajectory {
  const snaps = [...(history?.snapshots ?? [])].sort((a, b) =>
    (a.exportedAt || a.at).localeCompare(b.exportedAt || b.at),
  )

  const legs: Leg[] = []
  let prevDelta: Record<string, number> | null = null
  for (let i = 1; i < snaps.length; i++) {
    const a = snaps[i - 1]
    const b = snaps[i]
    const delta = dictDelta(a.vec, b.vec)
    legs.push({
      fromDate: shortDate(a.exportedAt || a.at),
      toDate: shortDate(b.exportedAt || b.at),
      displacement: dictDistance(a.vec, b.vec),
      growth: b.pages - a.pages,
      centreTurnover: 1 - jaccard(a.centers, b.centers),
      persistence: prevDelta ? cosine(prevDelta, delta) : null,
    })
    prevDelta = delta
  }

  const peakDisplacement = legs.reduce((m, l) => Math.max(m, l.displacement), 0)
  const span =
    snaps.length > 0
      ? {
          first: shortDate(snaps[0].exportedAt || snaps[0].at),
          last: shortDate(snaps[snaps.length - 1].exportedAt || snaps[snaps.length - 1].at),
        }
      : null

  let latest: Trajectory['latest'] = null
  if (legs.length > 0) {
    const last = legs[legs.length - 1]
    if (last.displacement < STILL) {
      latest = {
        health: 'stuck',
        note: 'The corpus barely moved between the last two exports — position holding despite time passing.',
      }
    } else if (last.persistence !== null && last.persistence > 0.6 && last.growth > 0) {
      latest = {
        health: 'accelerating',
        note: 'Motion is sustained in a consistent direction and the corpus is growing — a clear line of travel.',
      }
    } else {
      latest = {
        health: 'moving',
        note: 'The corpus is in motion; its shape shifted meaningfully since the previous export.',
      }
    }
  }

  return { legs, peakDisplacement, span, latest }
}
