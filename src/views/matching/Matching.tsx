import { useMemo, useState } from 'react'
import { useGraph } from '@/lib/graph'
import { ViewHeader } from '@/components/shell/ViewHeader'
import { EmptyState } from '@/components/ui/atoms'
import { MatchingDiagram } from './MatchingDiagram'
import { ProcurementDiagram } from './ProcurementDiagram'
import { MatchingFallback } from './MatchingFallback'
import type { Page } from '@/adapters/types'

/**
 * The How — outcome accelerator vs procurement. The contrast to land: fixed
 * procurement (cost it, buy it) versus a dynamic matching function between a
 * constructed demand space and a supply space, with a capital pool held against
 * outcomes.
 *
 * The rich bipartite diagram is the primary view; a plain node-link fallback is
 * always available (and used when the diagram cannot lay out), so the view ships
 * regardless.
 */
export function Matching() {
  const graph = useGraph()
  const [mode, setMode] = useState<'diagram' | 'list'>('diagram')

  const m = useMemo(() => graph?.matching(), [graph])
  const mechanisms = useMemo(() => graph?.mechanisms() ?? [], [graph])
  if (!graph || !m) return null

  const hasAnything =
    m.demand.length > 0 ||
    m.supply.length > 0 ||
    m.accelerator ||
    m.capital ||
    m.procurement

  return (
    <div>
      <ViewHeader move="Show how" title="The How">
        Procurement pre-purchases an output: cost it, buy it, done. An outcome
        accelerator is different in kind — a dynamic matching function that pairs
        a constructed demand space with a supply space, funded by a capital pool
        that settles against outcomes. See the difference; don't just read it.
      </ViewHeader>

      {!hasAnything ? (
        <MatchingEmpty mechanisms={mechanisms} />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2">
            <span className="eyebrow mr-1">View</span>
            <Toggle active={mode === 'diagram'} onClick={() => setMode('diagram')}>
              Matching diagram
            </Toggle>
            <Toggle active={mode === 'list'} onClick={() => setMode('list')}>
              Plain list
            </Toggle>
          </div>

          {mode === 'diagram' ? (
            <MatchingDiagram matching={m} />
          ) : (
            <MatchingFallback matching={m} />
          )}

          <div className="mt-12 border-t border-line pt-8">
            <p className="eyebrow mb-2">For contrast — the model it replaces</p>
            <ProcurementDiagram procurement={m.procurement} />
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Two different absences, told apart.
 *
 * The diagram is keyed on the ROLE tag, not on `layer: mechanism`, so a wiki can
 * hold plenty of mechanism pages and still draw nothing. Reporting that as "no
 * mechanism nodes" is false, and worse than vague: it sends the reader hunting
 * for pages that are already there. Found on the learning-system lens, which
 * carries seven mechanism pages and not one role between them.
 */
function MatchingEmpty({ mechanisms }: { mechanisms: Page[] }) {
  const roles = (
    <>
      <code className="font-mono">demand</code>,{' '}
      <code className="font-mono">supply</code>,{' '}
      <code className="font-mono">accelerator</code>,{' '}
      <code className="font-mono">capital</code> or{' '}
      <code className="font-mono">procurement</code>
    </>
  )

  if (mechanisms.length === 0) {
    return (
      <EmptyState
        title="No mechanism nodes in this export yet"
        hint={
          <>
            Nodes tagged <code className="font-mono">layer: mechanism</code>, each
            carrying one of {roles} as a tag, will assemble the two-sided matching
            diagram here.
          </>
        }
      />
    )
  }

  const shown = mechanisms.slice(0, 6)
  const rest = mechanisms.length - shown.length
  return (
    <EmptyState
      title={`${mechanisms.length} mechanism ${
        mechanisms.length === 1 ? 'page' : 'pages'
      }, none carrying a role yet`}
      hint={
        <>
          The diagram is assembled from roles, not from the layer alone — these
          pages are here, they just have no side to stand on. Tag each one {roles}{' '}
          and it will draw.{' '}
          <span className="text-ink-faint">
            {shown.map((p) => p.title).join(' \u00b7 ')}
            {rest > 0 ? ` \u00b7 and ${rest} more` : ''}
          </span>
        </>
      }
    />
  )
}

function Toggle({
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

export interface MatchingData {
  demand: import('@/adapters/types').Page[]
  supply: import('@/adapters/types').Page[]
  accelerator: import('@/adapters/types').Page | undefined
  capital: import('@/adapters/types').Page | undefined
  procurement: import('@/adapters/types').Page | undefined
}
