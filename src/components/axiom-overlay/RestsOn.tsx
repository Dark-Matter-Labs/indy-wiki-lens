import { useGraph } from '@/lib/graph'
import { useOverlay } from '@/lib/overlay'
import { EvidenceBadge } from '@/components/ui/atoms'
import type { Page } from '@/adapters/types'

/**
 * Shown when the Assumptions overlay is active: the axioms a given element rests
 * on, each with its honest evidence status. Clicking an axiom selects it,
 * highlighting everything downstream across the current view.
 */
export function RestsOn({ page }: { page: Page }) {
  const graph = useGraph()
  const { active, selectedAxiom, selectAxiom } = useOverlay()
  if (!active || !graph) return null

  const axioms = graph.many(page.restsOn)
  if (axioms.length === 0) return null

  return (
    <div className="mt-3 border-t border-dashed border-line pt-3">
      <p className="eyebrow mb-1.5">Rests on</p>
      <ul className="flex flex-wrap gap-1.5">
        {axioms.map((ax) => {
          const selected = selectedAxiom === ax.slug
          return (
            <li key={ax.slug}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  selectAxiom(selected ? null : ax.slug)
                }}
                className={`flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-xs transition-colors duration-fast ${
                  selected
                    ? 'border-accent bg-accent/10 text-ink'
                    : 'border-line text-ink-muted hover:border-line-strong hover:text-ink'
                }`}
                title={ax.description}
              >
                {ax.title}
                {ax.evidenceStatus && (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: `var(--color-${ax.evidenceStatus})` }}
                    aria-hidden
                  />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** A compact legend of evidence-status meanings, for the overlay. */
export function EvidenceLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <EvidenceBadge status="evidenced" />
      <EvidenceBadge status="assumptive" />
      <EvidenceBadge status="contested" />
    </div>
  )
}
