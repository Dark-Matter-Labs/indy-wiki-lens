import { useMemo, type MouseEvent } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useNavigate } from 'react-router-dom'
import { useGraph } from '@/lib/graph'

marked.setOptions({ gfm: true, breaks: false })

/**
 * Renders a wiki page body (markdown). Resolves [[Title]] and [[Title|display]]
 * wiki-links to internal /p/<slug> routes where the target exists in the public
 * graph; unresolved links degrade to plain text (matching the export contract,
 * which drops unresolved edges but leaves the prose).
 *
 * Output is sanitised with DOMPurify — defence in depth even though the body
 * originates from the trusted, build-time-fetched public export.
 */
export function Markdown({ body, className }: { body: string; className?: string }) {
  const graph = useGraph()
  const navigate = useNavigate()

  const html = useMemo(() => {
    const withLinks = body.replace(
      /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
      (_all, title: string, display?: string) => {
        const label = (display ?? title).trim()
        const slug = graph?.slugForTitle(title.trim())
        if (slug) {
          return `[${label}](/p/${encodeURI(slug)})`
        }
        return label
      },
    )
    const rendered = marked.parse(withLinks) as string
    return DOMPurify.sanitize(rendered)
  }, [body, graph])

  // Intercept clicks on internal links so wiki-link navigation stays SPA-smooth.
  function onClick(e: MouseEvent<HTMLDivElement>) {
    const anchor = (e.target as HTMLElement).closest('a')
    if (!anchor) return
    const href = anchor.getAttribute('href') ?? ''
    if (href.startsWith('/')) {
      e.preventDefault()
      navigate(href)
    }
  }

  return (
    <div
      className={className ?? 'prose'}
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
