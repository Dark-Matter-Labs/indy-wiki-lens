import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useGraph } from '@/lib/graph'
import { useOverlay } from '@/lib/overlay'
import { parseJourney } from '@/adapters/wiki'
import { Markdown } from '@/components/page/Markdown'
import { RestsOn } from '@/components/axiom-overlay/RestsOn'
import { Journey } from './Journey'
import { ConfidenceDots, EvidenceBadge, Tag } from '@/components/ui/atoms'
import { NotFound } from '@/views/NotFound'
import type { Page } from '@/adapters/types'

/**
 * Canonical route for any wiki page: /p/<slug> (slug may contain "/").
 * Unlisted pages render here (reachable by direct URL) but get noindex meta and
 * are never linked from public navigation.
 */
export function PageView() {
  const graph = useGraph()
  const params = useParams()
  const slug = params['*'] ?? ''
  const page = graph?.get(slug)

  useDocumentMeta(page)

  if (!graph) return null
  if (!page) return <NotFound />

  const journey = page.isAxiom ? null : parseJourney(page.body)

  return (
    <article className="mx-auto max-w-measure">
      <PageMeta page={page} />

      <h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight text-ink">
        {page.title}
      </h1>
      {page.description && (
        <p className="mt-3 text-lg text-ink-muted">{page.description}</p>
      )}

      {page.isAxiom && page.evidenceStatus && (
        <div className="mt-4">
          <EvidenceBadge status={page.evidenceStatus} />
        </div>
      )}

      <RestsOn page={page} />

      <div className="mt-8">
        {journey ? <Journey journey={journey} body={page.body} /> : <Markdown body={page.body} />}
      </div>

      <Related page={page} />
      {page.sources.length > 0 && <Sources sources={page.sources} />}
    </article>
  )
}

function PageMeta({ page }: { page: Page }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-faint">
      {page.layer && <Tag>{page.layer}</Tag>}
      <Tag>{page.type}</Tag>
      {page.horizon && <Tag>{page.horizon} horizon</Tag>}
      {page.visibility === 'unlisted' && <Tag>unlisted</Tag>}
      <span className="inline-flex items-center gap-1.5">
        <ConfidenceDots level={page.confidence} />
      </span>
      <span>·</span>
      <time dateTime={page.timestamp}>{page.timestamp}</time>
    </div>
  )
}

function Related({ page }: { page: Page }) {
  const graph = useGraph()
  const { active } = useOverlay()
  if (!graph) return null

  // In overlay mode, axioms are already surfaced by RestsOn; here we show the
  // rest of the neighbourhood.
  const out = graph
    .many(page.outbound)
    .filter((p) => !(active && p.isAxiom))
  const inbound = graph.many(page.inbound)

  if (out.length === 0 && inbound.length === 0) return null

  return (
    <section className="mt-12 border-t border-line pt-6">
      {out.length > 0 && (
        <RelatedList label="Links out" pages={out} />
      )}
      {inbound.length > 0 && (
        <div className="mt-6">
          <RelatedList label="Linked from" pages={inbound} />
        </div>
      )}
    </section>
  )
}

function RelatedList({ label, pages }: { label: string; pages: Page[] }) {
  return (
    <div>
      <p className="eyebrow mb-2">{label}</p>
      <ul className="flex flex-col gap-1">
        {pages.map((p) => (
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
    </div>
  )
}

function Sources({ sources }: { sources: string[] }) {
  return (
    <section className="mt-8 border-t border-line pt-6">
      <p className="eyebrow mb-2">Sources</p>
      <ul className="flex flex-col gap-1 text-sm text-ink-faint">
        {sources.map((s) => (
          <li key={s} className="font-mono text-xs">
            {s}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Sets document title and, for unlisted pages, a noindex robots meta tag. */
function useDocumentMeta(page: Page | undefined) {
  useEffect(() => {
    const prevTitle = document.title
    if (page) document.title = `${page.title} — The Lens`

    const meta = document.createElement('meta')
    meta.name = 'robots'
    if (page?.visibility === 'unlisted') {
      meta.content = 'noindex, nofollow'
      document.head.appendChild(meta)
    }
    return () => {
      document.title = prevTitle
      if (meta.parentNode) meta.parentNode.removeChild(meta)
    }
  }, [page])
}
