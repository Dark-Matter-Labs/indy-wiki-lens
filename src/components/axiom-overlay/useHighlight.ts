import { useMemo } from 'react'
import { useGraph } from '@/lib/graph'
import { useOverlay } from '@/lib/overlay'

/**
 * Overlay highlighting helper. When an axiom is selected, returns the set of
 * slugs downstream of it (everything that rests on it, transitively) plus a
 * `dimClass` a view can apply to non-downstream elements to recede them.
 *
 * When no axiom is selected (or overlay is off), `has` returns true for
 * everything and `dimClassFor` returns '' — views render normally.
 */
export function useHighlight() {
  const graph = useGraph()
  const { active, selectedAxiom } = useOverlay()

  const downstream = useMemo(() => {
    if (!graph || !selectedAxiom) return null
    const set = graph.downstreamOf(selectedAxiom)
    set.add(selectedAxiom)
    return set
  }, [graph, selectedAxiom])

  return {
    active,
    selectedAxiom,
    /** Is this slug part of the current highlight (or is nothing selected)? */
    has(slug: string): boolean {
      return !downstream || downstream.has(slug)
    },
    /** Tailwind classes to recede an element that is not highlighted. */
    dimClassFor(slug: string): string {
      if (!downstream) return ''
      return downstream.has(slug)
        ? 'ring-1 ring-accent/50'
        : 'opacity-40 transition-opacity duration-default'
    },
  }
}
