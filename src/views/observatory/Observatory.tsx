import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGraph } from '@/lib/graph'
import { ViewHeader } from '@/components/shell/ViewHeader'
import { Eyebrow, EmptyState } from '@/components/ui/atoms'
import { computeObservatory } from '@/adapters/observatory'
import type { GravityCenter } from '@/adapters/observatory'
import type { Page } from '@/adapters/types'

/**
 * The Observatory — a live read of the wiki's vital signs from the latest
 * public export: how much is there, when it was last touched, how it is
 * structured, and where its mass concentrates. Honest about being a single
 * snapshot (see computeObservatory): true trajectory needs export history.
 */
export function Observatory() {
  const graph = useGraph()
  const obs = useMemo(() => (graph ? computeObservatory(graph) : null), [graph])
  if (!graph || !obs) return null

  if (obs.counts.pages === 0) {
    return (
      <div>
        <ViewHeader move="Watch the corpus grow" title="The Observatory" />
        <EmptyState
          title="Nothing to observe yet"
          hint="As the public export fills, this view reads its scale, cadence, structure and centre of mass."
        />
      </div>
    )
  }

  const { counts, cadence, gravity, axiomLoad } = obs

  return (
    <div>
      <ViewHeader move="Watch the corpus grow" title="The Observatory">
        A live read of the wiki as a body of knowledge — its mass, its cadence,
        and where its gravity concentrates — taken from the latest public
        export. One snapshot: it shows what <em>is</em>, and the activity each
        page's timestamp implies. Motion over time arrives once successive
        exports are archived.
      </ViewHeader>

      {/* ---- vital signs ---- */}
      <section className="mx-auto mb-14 max-w-content">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Pages" value={counts.pages} />
          <StatTile label="Links" value={counts.links} />
          <StatTile label="Tags" value={counts.tags} />
          <StatTile label="Axioms" value={counts.axioms} />
          <StatTile label="Sources" value={counts.sources} />
          <StatTile
            label="Connections / page"
            value={gravity.avgDegree}
            decimals={1}
          />
        </div>
        <p className="mt-3 font-mono text-xs text-ink-faint">
          exported {relTime(cadence.exportedAt)} · {counts.unlisted} unlisted ·{' '}
          {counts.withSources} of {counts.pages} pages cite a source ·{' '}
          {gravity.orphans} orphan{gravity.orphans === 1 ? '' : 's'} (no links)
        </p>
      </section>

      {/* ---- cadence / heartbeat ---- */}
      <Section
        eyebrow="Cadence"
        title="When the corpus was last touched"
        note="Each page carries one timestamp — when it last changed. This is the rhythm of that activity across the snapshot, not a full commit history."
      >
        <Heartbeat obs={obs} />
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <MiniList title="Freshest" pages={cadence.freshest} />
          <MiniList title="Longest untouched" pages={cadence.stalest} />
        </div>
      </Section>

      {/* ---- gravity ---- */}
      <Section
        eyebrow="Centre of mass"
        title="Where the wiki's gravity concentrates"
        note="The static analog of Indy's repository-gravity: mass = link centrality. The most-connected ideas sit at the centre and pull the rest into orbit. Click any body to open it."
      >
        <GravityField centers={gravity.centers} maxDegree={gravity.maxDegree} />
        <ol className="mt-8 grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {gravity.centers.slice(0, 8).map((c, i) => (
            <li key={c.page.slug} className="flex items-baseline gap-3">
              <span className="w-5 shrink-0 font-mono text-xs text-ink-faint">
                {i + 1}
              </span>
              <Link
                to={`/p/${c.page.slug}`}
                className="flex-1 truncate text-sm text-ink hover:text-accent"
                title={c.page.title}
              >
                {c.page.title}
              </Link>
              <span className="shrink-0 font-mono text-xs text-ink-faint">
                {c.degree} link{c.degree === 1 ? '' : 's'}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      {/* ---- structure ---- */}
      <Section
        eyebrow="How it compounds"
        title="The shape of the knowledge"
        note="Structure lives in the layers and the links, not in a taxonomy imposed on the prose."
      >
        <div className="grid gap-10 lg:grid-cols-2">
          <Distribution title="By layer" rows={counts.byLayer} />
          <Distribution title="By type" rows={counts.byType} />
        </div>
        {axiomLoad.length > 0 && (
          <div className="mt-10">
            <Eyebrow>Load-bearing axioms</Eyebrow>
            <p className="mb-4 mt-1 text-sm text-ink-muted">
              How much of the corpus rests on each axiom (its transitive
              downstream).
            </p>
            <div className="flex flex-col gap-2.5">
              {axiomLoad.map(({ axiom, dependents }) => (
                <Bar
                  key={axiom.slug}
                  label={axiom.title}
                  to={`/p/${axiom.slug}`}
                  value={dependents}
                  max={Math.max(1, axiomLoad[0].dependents)}
                  suffix={`${dependents} rest${dependents === 1 ? 's' : ''} on it`}
                />
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ---- composition ---- */}
      <Section
        eyebrow="Composition"
        title="What it is made of"
        note="The honesty metadata: how sure, how grounded, how far out."
      >
        <div className="grid gap-10 lg:grid-cols-3">
          <Distribution title="Confidence" rows={counts.byConfidence} tone="confidence" />
          <Distribution title="Evidence (axioms)" rows={counts.byEvidence} tone="evidence" />
          <Distribution title="Horizon" rows={counts.byHorizon} />
        </div>
      </Section>

      <footer className="mx-auto mt-16 max-w-content border-t border-line pt-6 font-mono text-xs leading-relaxed text-ink-faint">
        A single-snapshot instrument. To measure true gravity and trajectory —
        displacement, direction persistence, novelty against the existing mass —
        the lens would archive each export it fetches, turning these still
        readings into motion. That upgrade is one build step away.
      </footer>
    </div>
  )
}

/* ---- layout ------------------------------------------------------------- */

function Section({
  eyebrow,
  title,
  note,
  children,
}: {
  eyebrow: string
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section className="mx-auto mb-16 max-w-content">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-1 font-serif text-2xl text-ink">{title}</h2>
      {note && <p className="mt-2 max-w-measure text-sm text-ink-muted">{note}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}

/* ---- vital signs -------------------------------------------------------- */

function StatTile({
  label,
  value,
  decimals = 0,
}: {
  label: string
  value: number
  decimals?: number
}) {
  const n = useCountUp(value)
  return (
    <div className="bg-surface px-5 py-6">
      <div className="font-serif text-4xl tabular-nums text-ink">
        {n.toFixed(decimals)}
      </div>
      <div className="mt-1 font-mono text-[0.7rem] uppercase tracking-wide text-ink-faint">
        {label}
      </div>
    </div>
  )
}

/* ---- cadence ------------------------------------------------------------ */

function Heartbeat({ obs }: { obs: ReturnType<typeof computeObservatory> }) {
  const { byDay, peak, first, last, spanDays } = obs.cadence
  const grown = useMountFlag()
  if (byDay.length === 0) return null
  return (
    <div>
      <div className="flex h-32 items-end gap-[3px]">
        {byDay.map((b) => {
          const h = peak ? (b.count / peak) * 100 : 0
          return (
            <div
              key={b.date}
              className="group relative flex-1"
              title={`${b.date} · ${b.count} page${b.count === 1 ? '' : 's'}`}
            >
              <div
                className="w-full rounded-sm bg-accent/80 transition-[height] duration-slow ease-default group-hover:bg-accent"
                style={{ height: grown ? `${Math.max(b.count ? 6 : 0, h)}%` : '0%' }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between font-mono text-xs text-ink-faint">
        <span>{first}</span>
        <span>
          {spanDays} day{spanDays === 1 ? '' : 's'} · peak {peak}/day
        </span>
        <span>{last}</span>
      </div>
    </div>
  )
}

function MiniList({ title, pages }: { title: string; pages: Page[] }) {
  return (
    <div>
      <Eyebrow>{title}</Eyebrow>
      <ul className="mt-2 flex flex-col gap-1.5">
        {pages.map((p) => (
          <li key={p.slug} className="flex items-baseline justify-between gap-3">
            <Link
              to={`/p/${p.slug}`}
              className="truncate text-sm text-ink hover:text-accent"
              title={p.title}
            >
              {p.title}
            </Link>
            <span className="shrink-0 font-mono text-xs text-ink-faint">
              {p.timestamp?.slice(0, 10)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---- gravity field ------------------------------------------------------ */

interface Placed extends GravityCenter {
  x: number
  y: number
  r: number
}

const W = 640
const H = 440

/** Deterministic radial layout: heaviest body at centre, rest in orbit rings. */
function layout(centers: GravityCenter[], maxDegree: number): Placed[] {
  const cx = W / 2
  const cy = H / 2
  const rMin = 7
  const rMax = 30
  const sizeOf = (d: number) =>
    rMin + (rMax - rMin) * Math.sqrt(maxDegree ? d / maxDegree : 0)

  const placed: Placed[] = []
  if (centers.length === 0) return placed
  placed.push({ ...centers[0], x: cx, y: cy, r: sizeOf(centers[0].degree) })

  const rest = centers.slice(1)
  // ring capacities grow outward; ring radius scales to fit the field
  const rings = [5, 8, 12]
  const maxOrbit = Math.min(W, H) / 2 - rMax - 10
  let idx = 0
  for (let ring = 0; ring < rings.length && idx < rest.length; ring++) {
    const cap = rings[ring]
    const inThis = Math.min(cap, rest.length - idx)
    const orbit = (maxOrbit * (ring + 1)) / rings.length
    for (let k = 0; k < inThis; k++, idx++) {
      const angle = (k / inThis) * Math.PI * 2 + ring * 0.6
      placed.push({
        ...rest[idx],
        x: cx + Math.cos(angle) * orbit,
        y: cy + Math.sin(angle) * orbit,
        r: sizeOf(rest[idx].degree),
      })
    }
  }
  return placed
}

function GravityField({
  centers,
  maxDegree,
}: {
  centers: GravityCenter[]
  maxDegree: number
}) {
  const placed = useMemo(() => layout(centers, maxDegree), [centers, maxDegree])
  const grown = useMountFlag()
  const navigate = useNavigate()
  const rings = [1, 2, 3]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Gravity field: the most-connected pages sit at the centre; size is link count."
    >
      {/* orbit rings */}
      {rings.map((r) => (
        <circle
          key={r}
          cx={W / 2}
          cy={H / 2}
          r={((Math.min(W, H) / 2 - 40) * r) / rings.length}
          fill="none"
          stroke="var(--color-line)"
          strokeDasharray="2 5"
        />
      ))}
      {placed.map((p, i) => {
        const opacity = 1 - (i / (placed.length + 2)) * 0.62
        return (
          <g
            key={p.page.slug}
            role="link"
            tabIndex={0}
            aria-label={`${p.page.title} — ${p.degree} links`}
            className="cursor-pointer"
            onClick={() => navigate(`/p/${p.page.slug}`)}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/p/${p.page.slug}`)}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={grown ? p.r : 0}
              fill="var(--color-accent)"
              fillOpacity={opacity}
              stroke="var(--color-bg)"
              strokeWidth={1.5}
              className="transition-all duration-slow ease-default hover:fill-accent-bright"
              style={{ transitionDelay: `${Math.min(i * 40, 500)}ms` }}
            >
              <title>{`${p.page.title} — ${p.degree} links`}</title>
            </circle>
            {i < 5 && (
              <text
                x={p.x}
                y={p.y + p.r + 12}
                textAnchor="middle"
                className="fill-ink-faint font-mono"
                style={{ fontSize: 10 }}
              >
                {truncate(p.page.title, 22)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/* ---- distributions & bars ---------------------------------------------- */

function Distribution({
  title,
  rows,
  tone,
}: {
  title: string
  rows: Array<{ key: string; count: number }>
  tone?: 'confidence' | 'evidence'
}) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div>
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-3 flex flex-col gap-2.5">
        {rows.map((r) => (
          <Bar
            key={r.key}
            label={r.key}
            value={r.count}
            max={max}
            suffix={String(r.count)}
            color={toneColor(tone, r.key)}
          />
        ))}
      </div>
    </div>
  )
}

function Bar({
  label,
  value,
  max,
  suffix,
  to,
  color = 'var(--color-accent)',
}: {
  label: string
  value: number
  max: number
  suffix: string
  to?: string
  color?: string
}) {
  const grown = useMountFlag()
  const pct = max ? (value / max) * 100 : 0
  const labelEl = to ? (
    <Link to={to} className="truncate hover:text-accent" title={label}>
      {label}
    </Link>
  ) : (
    <span className="truncate capitalize" title={label}>
      {label}
    </span>
  )
  return (
    <div className="flex items-center gap-3">
      <div className="w-40 shrink-0 text-sm text-ink">{labelEl}</div>
      <div className="h-2.5 flex-1 overflow-hidden rounded-sm bg-line">
        <div
          className="h-full rounded-sm transition-[width] duration-slow ease-default"
          style={{ width: grown ? `${Math.max(2, pct)}%` : '0%', background: color }}
        />
      </div>
      <div className="w-32 shrink-0 text-right font-mono text-xs text-ink-faint">
        {suffix}
      </div>
    </div>
  )
}

function toneColor(tone: string | undefined, key: string): string {
  if (tone === 'confidence') {
    return key === 'high'
      ? 'var(--color-accent)'
      : key === 'medium'
        ? 'var(--color-accent-muted)'
        : 'var(--color-ink-faint)'
  }
  if (tone === 'evidence') return `var(--color-${key})`
  return 'var(--color-accent)'
}

/* ---- hooks & utils ------------------------------------------------------ */

/** True after first paint — lets CSS transitions animate from a zero state. */
function useMountFlag(): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return on
}

/** Ease-out count-up to `target` over ~900ms (instant under reduced-motion). */
function useCountUp(target: number, ms = 900): number {
  const [n, setN] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    if (
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setN(target)
      return
    }
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(target * eased)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, ms])
  return n
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

function relTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'recently'
  const days = Math.round((Date.now() - then) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.round(days / 30)
  return months === 1 ? 'a month ago' : `${months} months ago`
}
