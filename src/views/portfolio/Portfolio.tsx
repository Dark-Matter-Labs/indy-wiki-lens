import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGraph } from '@/lib/graph'
import { useOverlay } from '@/lib/overlay'
import { useHighlight } from '@/components/axiom-overlay/useHighlight'
import { ViewHeader } from '@/components/shell/ViewHeader'
import { ConfidenceDots, EmptyState } from '@/components/ui/atoms'
import { RestsOn } from '@/components/axiom-overlay/RestsOn'
import { HORIZON_LABELS } from '@/adapters/wiki'
import type { Horizon, Page } from '@/adapters/types'

const HORIZONS: Array<Exclude<Horizon, null>> = ['near', 'mid', 'far']

/**
 * Indicative Portfolio — "is it possible". A scannable board, filterable by the
 * goal(s) an item serves and by horizon. Density and coverage at a glance, not
 * a table of records.
 */
export function Portfolio() {
  const graph = useGraph()
  const { active } = useOverlay()
  const [goalFilter, setGoalFilter] = useState<string | null>(null)
  const [horizonFilter, setHorizonFilter] = useState<Horizon>(null)

  const items = graph?.portfolio() ?? []
  const goals = graph?.goals() ?? []

  const filtered = useMemo(() => {
    return items.filter((p) => {
      if (horizonFilter && p.horizon !== horizonFilter) return false
      if (goalFilter) {
        const serves = graph?.goalsForPortfolio(p.slug).map((g) => g.slug) ?? []
        if (!serves.includes(goalFilter)) return false
      }
      return true
    })
  }, [items, graph, goalFilter, horizonFilter])

  if (!graph) return null

  return (
    <div>
      <ViewHeader move="Show it's possible" title="Indicative Portfolio">
        A portfolio you can point at. If a partner can see plausible things
        already taking shape — across horizons, against real goals — they lean
        in instead of leaning back.
      </ViewHeader>

      {items.length === 0 ? (
        <EmptyState
          title="No portfolio items in this export yet"
          hint={
            <>
              Nodes tagged <code className="font-mono">layer: portfolio</code>{' '}
              will appear here as cards, each linked to the goals it addresses.
            </>
          }
        />
      ) : (
        <>
          <Filters
            goals={goals}
            goalFilter={goalFilter}
            setGoalFilter={setGoalFilter}
            horizonFilter={horizonFilter}
            setHorizonFilter={setHorizonFilter}
            count={filtered.length}
            total={items.length}
          />

          <div className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <Card key={p.slug} page={p} showOverlay={active} />
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="mt-6 text-center text-sm text-ink-faint">
              No items match this filter.
            </p>
          )}
        </>
      )}
    </div>
  )
}

function Filters({
  goals,
  goalFilter,
  setGoalFilter,
  horizonFilter,
  setHorizonFilter,
  count,
  total,
}: {
  goals: Page[]
  goalFilter: string | null
  setGoalFilter: (s: string | null) => void
  horizonFilter: Horizon
  setHorizonFilter: (h: Horizon) => void
  count: number
  total: number
}) {
  return (
    <div className="flex flex-col gap-4 border-y border-line py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow mr-1">Horizon</span>
        <Chip active={!horizonFilter} onClick={() => setHorizonFilter(null)}>
          All
        </Chip>
        {HORIZONS.map((h) => (
          <Chip
            key={h}
            active={horizonFilter === h}
            onClick={() => setHorizonFilter(h)}
          >
            {HORIZON_LABELS[h]}
          </Chip>
        ))}
      </div>
      {goals.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">Goal</span>
          <Chip active={!goalFilter} onClick={() => setGoalFilter(null)}>
            All
          </Chip>
          {goals.map((g) => (
            <Chip
              key={g.slug}
              active={goalFilter === g.slug}
              onClick={() => setGoalFilter(g.slug)}
            >
              {g.title}
            </Chip>
          ))}
        </div>
      )}
      <p className="text-xs text-ink-faint">
        Showing {count} of {total}
      </p>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-sm border px-2 py-0.5 text-sm transition-colors duration-fast ${
        active
          ? 'border-accent bg-accent text-accent-contrast'
          : 'border-line text-ink-muted hover:border-line-strong hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function Card({ page, showOverlay }: { page: Page; showOverlay: boolean }) {
  const graph = useGraph()
  const hl = useHighlight()
  const goals = graph?.goalsForPortfolio(page.slug) ?? []

  return (
    <div
      className={`flex flex-col bg-surface p-5 transition-colors duration-fast hover:bg-surface-raised ${hl.dimClassFor(
        page.slug,
      )}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/p/${page.slug}`}
          className="font-serif text-xl leading-snug text-ink hover:text-accent"
        >
          {page.title}
        </Link>
        <ConfidenceDots level={page.confidence} />
      </div>
      {page.description && (
        <p className="mt-2 flex-1 text-sm leading-normal text-ink-muted">
          {page.description}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {page.horizon && (
          <span className="rounded-sm bg-line px-1.5 py-0.5 text-xs text-ink-muted">
            {HORIZON_LABELS[page.horizon]}
          </span>
        )}
        {goals.map((g) => (
          <Link
            key={g.slug}
            to={`/goals/${g.slug}`}
            className="rounded-sm border border-line px-1.5 py-0.5 text-xs text-ink-faint hover:border-accent hover:text-accent"
          >
            {g.title}
          </Link>
        ))}
      </div>
      {showOverlay && <RestsOn page={page} />}
    </div>
  )
}
