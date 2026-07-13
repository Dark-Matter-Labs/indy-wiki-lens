import { useMemo, useState } from 'react'
import { useGraph } from '@/lib/graph'
import { ViewHeader } from '@/components/shell/ViewHeader'
import { EmptyState } from '@/components/ui/atoms'
import { MatchingDiagram } from './MatchingDiagram'
import { ProcurementDiagram } from './ProcurementDiagram'
import { MatchingFallback } from './MatchingFallback'

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
        <EmptyState
          title="No mechanism nodes in this export yet"
          hint={
            <>
              Nodes tagged <code className="font-mono">layer: mechanism</code>{' '}
              with a role tag (<code className="font-mono">demand</code>,{' '}
              <code className="font-mono">supply</code>,{' '}
              <code className="font-mono">accelerator</code>,{' '}
              <code className="font-mono">capital</code>,{' '}
              <code className="font-mono">procurement</code>) will assemble the
              two-sided matching diagram here.
            </>
          }
        />
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
