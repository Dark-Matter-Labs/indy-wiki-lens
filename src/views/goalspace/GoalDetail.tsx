import { Link } from 'react-router-dom'
import { useGraph } from '@/lib/graph'
import { useOverlay } from '@/lib/overlay'
import { RestsOn } from '@/components/axiom-overlay/RestsOn'
import { ConfidenceDots } from '@/components/ui/atoms'
import type { Page } from '@/adapters/types'

/**
 * Side panel for the focused goal: its framing, the sibling framings at the same
 * level (shown as parallel alternatives — the cut you didn't take), the child
 * framings you can descend into, and the portfolio items that address it.
 */
export function GoalDetail({
  page,
  childCount,
  onDescend,
}: {
  page: Page | null
  childCount: number
  onDescend: (slug: string) => void
}) {
  const graph = useGraph()
  const { active } = useOverlay()

  if (!graph) return null

  if (!page) {
    return (
      <div className="rounded border border-line bg-surface p-5 text-sm text-ink-muted">
        <p className="eyebrow mb-2">The problem space</p>
        <p>
          Each circle is a goal; nesting is a deeper framing of the one above.
          Click to descend. {childCount} top-level framing
          {childCount === 1 ? '' : 's'} sit at the surface — parallel cuts of the
          same crisis.
        </p>
      </div>
    )
  }

  const siblings = page.parentSlug
    ? graph.children(page.parentSlug).filter((s) => s.slug !== page.slug)
    : graph.rootGoals().filter((s) => s.slug !== page.slug)
  const children = graph.children(page.slug)
  const portfolio = graph.portfolioForGoal(page.slug)

  return (
    <div className="flex flex-col gap-5 rounded border border-line bg-surface p-5">
      <div>
        <div className="flex items-start justify-between gap-2">
          <p className="eyebrow">Goal</p>
          <ConfidenceDots level={page.confidence} />
        </div>
        <h2 className="mt-1 font-serif text-2xl leading-tight text-ink">
          {page.title}
        </h2>
        {page.description && (
          <p className="mt-2 text-sm text-ink-muted">{page.description}</p>
        )}
        <Link
          to={`/p/${page.slug}`}
          className="mt-2 inline-block text-sm text-accent underline underline-offset-2"
        >
          Read the full framing
        </Link>
      </div>

      {active && <RestsOn page={page} />}

      {children.length > 0 && (
        <Section label="Deeper framings — descend">
          <ul className="flex flex-col gap-1">
            {children.map((c) => (
              <li key={c.slug}>
                <button
                  type="button"
                  onClick={() => onDescend(c.slug)}
                  className="text-left text-sm text-ink-muted hover:text-accent"
                >
                  ↳ {c.title}
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {siblings.length > 0 && (
        <Section label="Parallel framings — the cut you didn't take">
          <ul className="flex flex-col gap-1">
            {siblings.map((s) => (
              <li key={s.slug}>
                <button
                  type="button"
                  onClick={() => onDescend(s.slug)}
                  className="text-left text-sm text-ink-muted hover:text-accent"
                >
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section label={`Portfolio addressing this (${portfolio.length})`}>
        {portfolio.length === 0 ? (
          <p className="text-sm text-ink-faint">
            No portfolio items address this goal yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {portfolio.map((p) => (
              <li key={p.slug}>
                <Link
                  to={`/p/${p.slug}`}
                  className="text-sm text-ink-muted hover:text-accent"
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}

function Section({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-line pt-4">
      <p className="eyebrow mb-2">{label}</p>
      {children}
    </div>
  )
}
