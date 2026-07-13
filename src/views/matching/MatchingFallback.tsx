import { Link } from 'react-router-dom'
import type { MatchingData } from './Matching'
import type { Page } from '@/adapters/types'

/**
 * Plain node-link fallback for the matching view. Ships the meaning even where
 * the SVG diagram can't (or the user prefers text): constructed demand, the
 * accelerator + capital pool between, and supply capacity.
 */
export function MatchingFallback({ matching }: { matching: MatchingData }) {
  const { demand, supply, accelerator, capital } = matching
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Column title="Constructed demand" pages={demand} />
      <div className="flex flex-col gap-3">
        <div className="rounded border-2 border-accent bg-surface p-4 text-center">
          <p className="eyebrow text-accent">The matching function</p>
          <p className="mt-1 font-serif text-lg text-ink">
            {accelerator?.title ?? 'Outcome accelerator'}
          </p>
          {accelerator?.description && (
            <p className="mt-1 text-sm text-ink-muted">
              {accelerator.description}
            </p>
          )}
        </div>
        {capital && (
          <div className="rounded border border-line bg-surface p-4 text-center">
            <p className="eyebrow">Capital pool</p>
            <p className="mt-1 text-ink">{capital.title}</p>
            <p className="mt-1 text-xs text-ink-faint">
              Released against outcomes, into the matching function.
            </p>
          </div>
        )}
      </div>
      <Column title="Supply capacity" pages={supply} align="right" />
    </div>
  )
}

function Column({
  title,
  pages,
  align,
}: {
  title: string
  pages: Page[]
  align?: 'right'
}) {
  return (
    <div className={align === 'right' ? 'md:text-right' : ''}>
      <p className="eyebrow mb-2">{title}</p>
      {pages.length === 0 ? (
        <p className="text-sm text-ink-faint">None tagged yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pages.map((p) => (
            <li key={p.slug} className="rounded border border-line bg-surface p-3">
              <Link
                to={`/p/${p.slug}`}
                className="font-medium text-ink hover:text-accent"
              >
                {p.title}
              </Link>
              {p.description && (
                <p className="mt-1 text-sm text-ink-muted">{p.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
