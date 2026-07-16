import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGraph } from '@/lib/graph'
import { ViewHeader } from '@/components/shell/ViewHeader'
import { ConfidenceDots, EmptyState } from '@/components/ui/atoms'
import { HORIZON_LABELS } from '@/adapters/wiki'
import type { Horizon, Page } from '@/adapters/types'

const LANES: Array<Exclude<Horizon, null>> = ['near', 'mid', 'far']
const LANE_HINT: Record<Exclude<Horizon, null>, string> = {
  near: 'What is already moving',
  mid: 'What follows once the near is underway',
  far: 'What the near and mid make reachable',
}

interface Connector {
  from: string
  to: string
  path: string
}

/**
 * Sequence — "when". Horizon lanes (near / mid / far), not a false-precision
 * Gantt. Dependency arrows are drawn ONLY where the graph asserts a forward
 * link across horizons (see WikiGraph.sequenceEdges).
 */
export function Sequence() {
  const graph = useGraph()
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef(new Map<string, HTMLElement>())
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [dims, setDims] = useState({ w: 0, h: 0 })

  // Memoised: these selectors build fresh arrays each call. Without this,
  // `measure` (and the layout effect keyed on it) gets a new identity every
  // render, re-runs, setStates, and re-renders — an infinite loop (React #185).
  const lanes = useMemo(() => graph?.horizonLanes(), [graph])
  const edges = useMemo(() => graph?.sequenceEdges() ?? [], [graph])
  const populated = lanes ? LANES.some((l) => lanes[l].length > 0) : false

  const measure = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const base = container.getBoundingClientRect()
    setDims({ w: base.width, h: base.height })
    const next: Connector[] = []
    for (const e of edges) {
      const a = cardRefs.current.get(e.from)
      const b = cardRefs.current.get(e.to)
      if (!a || !b) continue
      const ra = a.getBoundingClientRect()
      const rb = b.getBoundingClientRect()
      // from bottom-centre of source to top-centre of target (lanes stack down)
      const x1 = ra.left - base.left + ra.width / 2
      const y1 = ra.bottom - base.top
      const x2 = rb.left - base.left + rb.width / 2
      const y2 = rb.top - base.top
      const midY = (y1 + y2) / 2
      next.push({
        from: e.from,
        to: e.to,
        path: `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`,
      })
    }
    setConnectors(next)
  }, [edges])

  useLayoutEffect(() => {
    measure()
    const ro = new ResizeObserver(measure)
    if (containerRef.current) ro.observe(containerRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  if (!graph) return null

  return (
    <div>
      <ViewHeader move="Show when" title="Sequence">
        Horizons, not a fake-precision timeline. What is moving now, what follows,
        and what the earlier moves make reachable. Arrows appear only where the
        wiki actually asserts a dependency.
      </ViewHeader>

      {!populated ? (
        <EmptyState
          title="Nothing is placed on a horizon yet"
          hint={
            <>
              Give nodes a <code className="font-mono">horizon</code> of{' '}
              <code className="font-mono">near</code>,{' '}
              <code className="font-mono">mid</code> or{' '}
              <code className="font-mono">far</code> and they will fall into these
              lanes. A link from an earlier to a later horizon is drawn as a
              dependency arrow.
            </>
          }
        />
      ) : (
        <div ref={containerRef} className="relative">
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            width={dims.w}
            height={dims.h}
            aria-hidden
          >
            <defs>
              <marker
                id="seq-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-accent)" />
              </marker>
            </defs>
            {connectors.map((c) => (
              <path
                key={`${c.from}->${c.to}`}
                d={c.path}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={1.5}
                strokeDasharray="2 3"
                markerEnd="url(#seq-arrow)"
                opacity={0.7}
              />
            ))}
          </svg>

          <div className="flex flex-col gap-8">
            {LANES.map((lane) => (
              <Lane
                key={lane}
                lane={lane}
                pages={lanes ? lanes[lane] : []}
                registerCard={(slug, el) => {
                  if (el) cardRefs.current.set(slug, el)
                  else cardRefs.current.delete(slug)
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Lane({
  lane,
  pages,
  registerCard,
}: {
  lane: Exclude<Horizon, null>
  pages: Page[]
  registerCard: (slug: string, el: HTMLElement | null) => void
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3 border-b border-line pb-2">
        <h2 className="font-serif text-2xl text-ink">{HORIZON_LABELS[lane]}</h2>
        <p className="text-sm text-ink-faint">{LANE_HINT[lane]}</p>
      </div>
      {pages.length === 0 ? (
        <p className="py-4 text-sm text-ink-faint">Nothing on this horizon yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((p) => (
            <div
              key={p.slug}
              ref={(el) => registerCard(p.slug, el)}
              className="rounded border border-line bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={`/p/${p.slug}`}
                  className="font-medium text-ink hover:text-accent"
                >
                  {p.title}
                </Link>
                <ConfidenceDots level={p.confidence} />
              </div>
              {p.description && (
                <p className="mt-1.5 text-sm text-ink-muted">{p.description}</p>
              )}
              {p.layer && (
                <span className="mt-3 inline-block rounded-sm bg-line px-1.5 py-0.5 text-xs text-ink-faint">
                  {p.layer}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
