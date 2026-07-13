import { Link } from 'react-router-dom'
import { useGraph } from '@/lib/graph'
import { ViewHeader } from '@/components/shell/ViewHeader'
import { EmptyState } from '@/components/ui/atoms'
import { Markdown } from '@/components/page/Markdown'
import type { Page } from '@/adapters/types'

/**
 * Reflections & Challenges — the living feed. Weekly reflections render as
 * deviation → wider-world → early signals → counterposition (when the body
 * marks those headings). The joker's counterposition briefs get a distinct,
 * rival-voice treatment via layout + typography — not cartoon styling.
 */
export function Feed() {
  const graph = useGraph()
  if (!graph) return null
  const items = graph.feed()

  return (
    <div>
      <ViewHeader move="The testing ground" title="Reflections & Challenges">
        Where the model meets the week. Each entry records where the thinking
        deviated, how that connects to the wider world, the early signals, and
        the counterposition it invites. The joker writes back.
      </ViewHeader>

      {items.length === 0 ? (
        <EmptyState
          title="No reflections or challenges in this export yet"
          hint={
            <>
              Pages under <code className="font-mono">wiki/reflections/</code> and{' '}
              <code className="font-mono">wiki/challenges/</code> (or tagged{' '}
              <code className="font-mono">reflection</code> /{' '}
              <code className="font-mono">challenge</code>) will appear here as a
              feed.
            </>
          }
        />
      ) : (
        <ol className="mx-auto flex max-w-measure flex-col gap-8">
          {items.map(({ page, kind, joker }) =>
            joker ? (
              <JokerEntry key={page.slug} page={page} />
            ) : (
              <FeedEntry key={page.slug} page={page} kind={kind} />
            ),
          )}
        </ol>
      )}
    </div>
  )
}

function FeedEntry({ page, kind }: { page: Page; kind: 'reflection' | 'challenge' }) {
  return (
    <li className="border-l-2 border-line pl-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow">{kind}</p>
        <time className="text-xs text-ink-faint" dateTime={page.timestamp}>
          {page.timestamp}
        </time>
      </div>
      <h2 className="mt-1 font-serif text-2xl leading-tight text-ink">
        <Link to={`/p/${page.slug}`} className="hover:text-accent">
          {page.title}
        </Link>
      </h2>
      {page.description && (
        <p className="mt-1 text-ink-muted">{page.description}</p>
      )}
      <div className="mt-4">
        <Markdown body={page.body} className="prose text-base" />
      </div>
    </li>
  )
}

/**
 * The joker's counterposition. Deliberately set as a rival voice: right-aligned
 * accent rule, different type treatment, an explicit "counterposition" frame.
 * Distinct through layout, not decoration.
 */
function JokerEntry({ page }: { page: Page }) {
  return (
    <li className="border-r-2 border-accent bg-surface pr-5 pl-5 py-4 text-right">
      <div className="flex items-baseline justify-between gap-3">
        <time className="text-xs text-ink-faint" dateTime={page.timestamp}>
          {page.timestamp}
        </time>
        <p className="eyebrow text-accent">Counterposition · the joker</p>
      </div>
      <h2 className="mt-1 font-serif text-2xl italic leading-tight text-ink">
        <Link to={`/p/${page.slug}`} className="hover:text-accent">
          {page.title}
        </Link>
      </h2>
      <div className="mt-4 text-left">
        <Markdown body={page.body} className="prose text-base italic" />
      </div>
    </li>
  )
}
