import { Link } from 'react-router-dom'
import type { Page } from '@/adapters/types'

/**
 * The static procurement counter-diagram. A single, fixed, linear pipe: specify
 * the output, price it, buy it. Deliberately rigid and grey — so the difference
 * from the accelerator is seen, not read.
 */
export function ProcurementDiagram({
  procurement,
}: {
  procurement: Page | undefined
}) {
  const steps = ['Specify the output', 'Cost it', 'Pre-purchase it', 'Deliver']
  return (
    <div>
      <div className="flex flex-wrap items-stretch gap-0">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className="rounded-sm border border-line-strong bg-surface px-4 py-3 text-sm text-ink-muted">
              {s}
            </div>
            {i < steps.length - 1 && (
              <span className="px-2 text-ink-faint" aria-hidden>
                →
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 max-w-measure text-sm text-ink-faint">
        Fixed and linear. No demand is constructed, no supply is discovered, no
        capital follows the outcome — the price is set before anyone knows what
        actually works.
        {procurement && (
          <>
            {' '}
            <Link
              to={`/p/${procurement.slug}`}
              className="text-accent underline underline-offset-2"
            >
              {procurement.title}
            </Link>
          </>
        )}
      </p>
    </div>
  )
}
