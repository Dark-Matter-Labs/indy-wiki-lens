import { Link } from 'react-router-dom'
import { useGraph } from '@/lib/graph'
import { useOverlay } from '@/lib/overlay'
import { ViewHeader } from '@/components/shell/ViewHeader'
import { EmptyState, EvidenceBadge } from '@/components/ui/atoms'
import { EvidenceLegend } from '@/components/axiom-overlay/RestsOn'
import type { Page } from '@/adapters/types'

/**
 * The Axioms register — the explainability layer made explicit. Every axiom is
 * shown with its honest evidence status; selecting one reveals what rests on it
 * (its downstream), which the Assumptions overlay then highlights across views.
 */
export function Axioms() {
  const graph = useGraph()
  if (!graph) return null

  const axioms = graph.axioms()

  return (
    <div>
      <ViewHeader move="Expose the assumptions" title="Axioms">
        People need to see the underlying assumption models. These are the
        load-bearing beliefs everything else rests on — shown honestly. What is
        evidenced is marked evidenced; what is assumed is marked assumptive; what
        is disputed is marked contested.
      </ViewHeader>

      {axioms.length === 0 ? (
        <EmptyState
          title="No axioms in this export yet"
          hint={
            <>
              Nodes tagged <code className="font-mono">axiom</code> (with an
              optional{' '}
              <code className="font-mono">status:evidenced|assumptive|contested</code>{' '}
              tag) will appear here, and every element that links to one will show
              that it rests on it.
            </>
          }
        />
      ) : (
        <div className="mx-auto max-w-content">
          <div className="mb-6">
            <EvidenceLegend />
          </div>
          <ul className="flex flex-col gap-px overflow-hidden rounded border border-line bg-line">
            {axioms.map((ax) => (
              <AxiomRow key={ax.slug} axiom={ax} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function AxiomRow({ axiom }: { axiom: Page }) {
  const graph = useGraph()
  const { selectedAxiom, selectAxiom } = useOverlay()
  const selected = selectedAxiom === axiom.slug
  const downstream = graph ? graph.downstreamOf(axiom.slug) : new Set<string>()
  const dependents = graph ? graph.many([...downstream]) : []

  return (
    <li className="bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-measure">
          <Link
            to={`/p/${axiom.slug}`}
            className="font-serif text-xl text-ink hover:text-accent"
          >
            {axiom.title}
          </Link>
          {axiom.description && (
            <p className="mt-1 text-sm text-ink-muted">{axiom.description}</p>
          )}
        </div>
        {axiom.evidenceStatus && <EvidenceBadge status={axiom.evidenceStatus} />}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => selectAxiom(selected ? null : axiom.slug)}
          className={`rounded-sm border px-2 py-0.5 text-xs font-medium transition-colors duration-fast ${
            selected
              ? 'border-accent bg-accent text-accent-contrast'
              : 'border-line text-ink-muted hover:border-line-strong hover:text-ink'
          }`}
        >
          {selected ? 'Highlighting downstream' : 'Show what rests on this'}
        </button>
        <span className="text-xs text-ink-faint">
          {dependents.length === 0
            ? 'Nothing links to this yet'
            : `${dependents.length} element${dependents.length === 1 ? '' : 's'} rest on it`}
        </span>
      </div>

      {selected && dependents.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-dashed border-line pt-3">
          {dependents.map((d) => (
            <li key={d.slug}>
              <Link
                to={`/p/${d.slug}`}
                className="rounded-sm border border-line px-1.5 py-0.5 text-xs text-ink-muted hover:border-accent hover:text-accent"
              >
                {d.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
