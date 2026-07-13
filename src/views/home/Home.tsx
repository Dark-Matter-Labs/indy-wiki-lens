import { Link } from 'react-router-dom'
import { useGraph } from '@/lib/graph'
import { Masthead } from '@/components/shell/Masthead'

const SEQUENCE = [
  {
    to: '/goals',
    n: '01',
    move: 'Define the problem',
    title: 'Goal Space',
    blurb:
      'A problem space is nested, not single. The obvious goal sits on top of deeper ones. Choosing the wrong level solves the wrong problem.',
  },
  {
    to: '/portfolio',
    n: '02',
    move: "Show it's possible",
    title: 'Indicative Portfolio',
    blurb:
      "If you can't show an indicative portfolio, people lean back and fall over. This is a gestalt of plausibility — coverage at a glance.",
  },
  {
    to: '/how',
    n: '03',
    move: 'Show how',
    title: 'The How',
    blurb:
      'Not procurement — a dynamic matching function between a constructed demand space and a supply space, with capital held against outcomes.',
  },
  {
    to: '/sequence',
    n: '04',
    move: 'Show when',
    title: 'Sequence',
    blurb:
      'Horizons, not false-precision Gantt charts. Near, mid, far — with dependency arrows only where the graph actually asserts them.',
  },
  {
    to: '/feed',
    n: '05',
    move: 'The testing ground',
    title: 'Reflections & Challenges',
    blurb:
      'The living feed. Weekly deviations, their connection to the wider world, early signals — and the joker writing the counterposition.',
  },
]

export function Home() {
  const graph = useGraph()
  const empty = graph && graph.pages.length === 0

  return (
    <div>
      <Masthead />

      <section className="mx-auto mt-10 max-w-measure">
        <p className="text-lg leading-normal text-ink-muted">
          This is not a dashboard and not a documentation site. Each view makes
          one move in a sequence. Turn on{' '}
          <span className="font-medium text-ink">Assumptions</span> on any view
          to see the load-bearing axioms and how honest the evidence for each
          one really is.
        </p>
      </section>

      {empty && (
        <div className="mx-auto mb-8 max-w-measure rounded border border-dashed border-line-strong bg-surface px-6 py-6 text-sm text-ink-muted">
          The public export is currently empty — no pages have been published
          yet. Each view below explains what it will show and what tagging in the
          wiki will light it up. The structure is ready; it fills as the wiki
          publishes.
        </div>
      )}

      <ol className="mx-auto grid max-w-content gap-px overflow-hidden rounded border border-line bg-line">
        {SEQUENCE.map((step) => (
          <li key={step.to} className="bg-surface">
            <Link
              to={step.to}
              className="group flex flex-col gap-2 p-6 transition-colors duration-fast hover:bg-surface-raised sm:flex-row sm:items-baseline sm:gap-8"
            >
              <div className="flex shrink-0 items-baseline gap-3 sm:w-64">
                <span className="font-mono text-sm text-accent">{step.n}</span>
                <div>
                  <p className="eyebrow">{step.move}</p>
                  <p className="font-serif text-2xl leading-tight text-ink">
                    {step.title}
                  </p>
                </div>
              </div>
              <p className="text-ink-muted sm:flex-1">{step.blurb}</p>
              <span
                className="hidden self-center text-accent opacity-0 transition-opacity duration-fast group-hover:opacity-100 sm:block"
                aria-hidden
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
