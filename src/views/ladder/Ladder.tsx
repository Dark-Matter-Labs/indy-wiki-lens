import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { useGraph } from '@/lib/graph'
import { ViewHeader } from '@/components/shell/ViewHeader'
import { ConfidenceDots, EmptyState, Tag } from '@/components/ui/atoms'
import type { LadderRung, Page } from '@/adapters/types'

/**
 * The Knowledge Ladder — an experimental lens that maps every wiki page onto
 * one of QNO's five rungs of epistemic maturity
 * (https://junglepublics.github.io/dml/learning-system-v3.html).
 *
 * The wiki has no explicit epistemic-status field, so the rung is DERIVED (see
 * `rungFor` in the adapter). This view is honest about that: it names the
 * signals it reasons from, and the gate — the human act — that would promote a
 * page up a rung. The point is to feel how much of this structure the existing
 * wiki already implies, and what an explicit status field would sharpen.
 */

interface RungMeta {
  key: LadderRung
  n: number
  name: string
  definition: string
  /** The act that promotes a page FROM this rung to the next. */
  gate?: string
}

/** Ordered low → high. The gate on rung N is the act that lifts it to N+1. */
const RUNGS: RungMeta[] = [
  {
    key: 'assumption',
    n: 1,
    name: 'Assumptions',
    definition:
      'Load-bearing beliefs taken as given — the ground everything else stands on, held before it is examined.',
    gate: 'Notice it — surface the belief as something that could be otherwise.',
  },
  {
    key: 'hunch',
    n: 2,
    name: 'Hunches',
    definition:
      'Early intuitions and open questions. Something felt, not yet framed as testable.',
    gate: 'Frame it — state what would confirm or deny it.',
  },
  {
    key: 'hypothesis',
    n: 3,
    name: 'Hypotheses',
    definition:
      'Testable propositions being actively worked — held with medium confidence, awaiting evidence.',
    gate: 'Test it — gather evidence and declare the confidence it earns.',
  },
  {
    key: 'claim',
    n: 4,
    name: 'Claims',
    definition:
      'Asserted with confidence, backed by evidence. Set down for others to test and rely on.',
    gate: 'Refine it — integrate, withstand challenge, synthesise across claims.',
  },
  {
    key: 'refined-claim',
    n: 5,
    name: 'Refined Claims',
    definition:
      'Matured, integrated positions that have survived challenge and been synthesised — the far end of the climb.',
  },
]

export function Ladder() {
  const graph = useGraph()
  if (!graph) return null

  const grouped = graph.ladder()
  const total = RUNGS.reduce((n, r) => n + grouped[r.key].length, 0)

  return (
    <div>
      <ViewHeader move="Trace the epistemic climb" title="Knowledge Ladder">
        Every element in the wiki sits somewhere between an unexamined assumption
        and a refined claim. This lens sorts them onto QNO's five rungs — a live,
        dynamic read of how mature the current knowledge is, and where the work
        of climbing still waits.
      </ViewHeader>

      <DerivationNote />

      {total === 0 ? (
        <EmptyState
          title="Nothing to place on the ladder yet"
          hint="Once the public export carries pages, each will be sorted onto a rung by its confidence, type, and any explicit epistemic tag."
        />
      ) : (
        <ol className="mx-auto max-w-content">
          {RUNGS.map((rung, i) => (
            <Fragment key={rung.key}>
              <RungBlock rung={rung} pages={grouped[rung.key]} />
              {rung.gate && i < RUNGS.length - 1 && <Gate label={rung.gate} />}
            </Fragment>
          ))}
        </ol>
      )}
    </div>
  )
}

/** The honesty panel: this classification is derived, and how. */
function DerivationNote() {
  return (
    <div className="mx-auto mb-10 max-w-content rounded border border-dashed border-line-strong bg-surface px-5 py-4 text-sm leading-normal text-ink-muted">
      <p>
        <span className="font-medium text-ink">This placement is derived.</span>{' '}
        The wiki has no explicit epistemic-status field, so each page's rung is
        inferred from two signals it does carry — its{' '}
        <span className="text-ink">confidence</span> (epistemic maturity) and its{' '}
        <span className="text-ink">type</span> (how much argument it declares).
        Axioms are read as assumptions. An explicit tag —{' '}
        <code className="font-mono text-xs">hunch</code>,{' '}
        <code className="font-mono text-xs">hypothesis</code>,{' '}
        <code className="font-mono text-xs">claim</code>,{' '}
        <code className="font-mono text-xs">refined-claim</code> — always wins,
        and is the one change that would make this exact rather than inferred.
      </p>
    </div>
  )
}

/** The gate between two rungs: the human act that promotes a page upward. */
function Gate({ label }: { label: string }) {
  return (
    <li className="relative py-3 pl-4" aria-hidden>
      <div className="flex items-center gap-3 text-xs text-ink-faint">
        <span className="font-mono uppercase tracking-wide">Gate</span>
        <span className="h-px flex-1 bg-line" />
        <span className="max-w-measure text-ink-muted">{label}</span>
        <span className="h-px flex-1 bg-line" />
      </div>
    </li>
  )
}

function RungBlock({ rung, pages }: { rung: RungMeta; pages: Page[] }) {
  return (
    <li className="rounded border border-line bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="flex items-baseline gap-3 font-serif text-2xl text-ink">
          <span className="font-mono text-sm text-ink-faint">{rung.n}</span>
          {rung.name}
        </h2>
        <span className="text-sm text-ink-faint">
          {pages.length === 0
            ? 'empty'
            : `${pages.length} ${pages.length === 1 ? 'page' : 'pages'}`}
        </span>
      </div>
      <p className="mt-2 max-w-measure text-sm leading-normal text-ink-muted">
        {rung.definition}
      </p>

      {pages.length > 0 && (
        <ul className="mt-5 grid gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-2">
          {pages.map((p) => (
            <RungCard key={p.slug} page={p} />
          ))}
        </ul>
      )}
    </li>
  )
}

function RungCard({ page }: { page: Page }) {
  return (
    <li className="bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <Link
          to={`/p/${page.slug}`}
          className="font-serif text-lg leading-snug text-ink hover:text-accent"
        >
          {page.title}
        </Link>
        <ConfidenceDots level={page.confidence} />
      </div>
      {page.description && (
        <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
          {page.description}
        </p>
      )}
      <div className="mt-2">
        <Tag>{page.type}</Tag>
      </div>
    </li>
  )
}
