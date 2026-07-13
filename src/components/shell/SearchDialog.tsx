import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGraph } from '@/lib/graph'
import type { Page } from '@/adapters/types'

/**
 * Global search over public + unlisted titles/descriptions. (Unlisted pages
 * are reachable by direct URL and by search — they are excluded only from
 * public navigation, sitemap and indexing — but here we search `listable`,
 * which excludes unlisted, keeping them out of discovery. Deep links still
 * resolve.)
 */
export function SearchDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const graph = useGraph()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo<Page[]>(
    () => (graph ? graph.search(query) : []),
    [graph, query],
  )

  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      // focus after mount
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => setCursor(0), [query])

  // Global "/" to open is wired by the parent via a keydown; here we handle Esc.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  function go(page: Page) {
    navigate(`/p/${page.slug}`)
    onClose()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter' && results[cursor]) {
      go(results[cursor])
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/20 px-4 pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-lg border border-line bg-surface shadow"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search the knowledge graph…"
          className="w-full border-b border-line bg-transparent px-4 py-3.5 text-base text-ink outline-none placeholder:text-ink-faint"
        />
        {query && (
          <ul className="max-h-[50vh] overflow-y-auto py-1">
            {results.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-ink-faint">
                Nothing matches “{query}”.
              </li>
            )}
            {results.map((page, i) => (
              <li key={page.slug}>
                <button
                  type="button"
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => go(page)}
                  className={`flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left ${
                    i === cursor ? 'bg-surface-raised' : ''
                  }`}
                >
                  <span className="text-sm font-medium text-ink">
                    {page.title}
                  </span>
                  {page.description && (
                    <span className="line-clamp-1 text-xs text-ink-muted">
                      {page.description}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-line px-4 py-2 text-xs text-ink-faint">
          ↑↓ to move · ↵ to open · esc to close
        </div>
      </div>
    </div>
  )
}
