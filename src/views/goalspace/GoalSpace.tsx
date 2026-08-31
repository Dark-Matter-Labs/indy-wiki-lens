import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as d3 from 'd3'
import { useGraph } from '@/lib/graph'
import { ViewHeader } from '@/components/shell/ViewHeader'
import { EmptyState } from '@/components/ui/atoms'
import type { WikiGraph } from '@/adapters/wiki'
import type { Page } from '@/adapters/types'
import { GoalDetail } from './GoalDetail'

const SIZE = 720
const ROOT = '__root__'

interface TreeNode {
  slug: string
  title: string
  page: Page | null
  children: TreeNode[]
}

function buildTree(graph: WikiGraph): TreeNode {
  const build = (p: Page): TreeNode => ({
    slug: p.slug,
    title: p.title,
    page: p,
    children: graph.children(p.slug).map(build),
  })
  return {
    slug: ROOT,
    title: 'The problem space',
    page: null,
    children: graph.rootGoals().map(build),
  }
}

/* ---- label fitting ------------------------------------------------------
 *
 * Everything here works in SCREEN pixels, then divides by the zoom `k` on the
 * way out. The previous version mixed the two — `min(r/4,16)/k + 6` scaled one
 * term and not the other — so type size drifted with zoom and long titles ran
 * straight out of their circle and got clipped by the frame.
 */

/**
 * Advance width of Inter for mixed-case text, as a fraction of font size.
 * 0.55 was measured against lowercase and ran ~2–10% narrow once capitals and
 * wide glyphs were in play, which put four of eight labels marginally over
 * their circle. 0.60 is the honest average.
 */
const CHAR_W = 0.6
const LINE_H = 1.18

/** Greedy wrap. Returns null if any single word cannot fit `maxChars`. */
function wrap(words: string[], maxChars: number): string[] | null {
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    if (w.length > maxChars) return null // this size cannot hold the longest word
    const next = line ? `${line} ${w}` : w
    if (next.length <= maxChars) line = next
    else {
      lines.push(line)
      line = w
    }
  }
  if (line) lines.push(line)
  return lines
}

const MIN_FONT = 10
/** Keep type clear of the stroke, and of the halo drawn around it. */
const INSET = 0.9
/**
 * Where a parent's label sits, as a fraction of its radius above centre. Not
 * flush with the rim: the chord there is almost nothing, and pinning the block
 * to the edge cost two of the five parent labels outright. 0.72 leaves a chord
 * wide enough to hold a real title while staying clear of the children below.
 */
const TOP_BAND = 0.72

/**
 * Largest font size at which `title` fits inside a circle of screen radius `R`,
 * with the lines it wraps to. `dyBias` shifts the block off centre: leaves pass
 * 0 (the centre is free), parents pass `'top'` (their centre belongs to their
 * children, so the label goes in the band inside the top edge).
 *
 * The width available is the **chord at the outermost line's height**, computed
 * exactly rather than approximated. That matters more than it sounds. A flat
 * 1.35R box rejected "Halt biodiversity collapse" outright — "biodiversity" is
 * twelve characters and would not fit even at the minimum size — while the real
 * chord through the middle of the same circle is 2R and holds it comfortably.
 * The first version of the parent band used a 1.6× fudge instead of the chord
 * and overflowed by 10%.
 *
 * Searches font size downward and, at each size, line count upward, so a long
 * word forces a smaller size rather than an overflow. Returns null only when
 * nothing fits at `MIN_FONT` — and then the caller draws no label at all,
 * because a clipped fragment ("t biodiversity col…") is worse than a bare
 * circle the reader can hover or zoom into.
 */
function fitLabel(
  title: string,
  R: number,
  placement: 'centre' | 'top',
  maxFont: number,
  maxLines: number,
): { font: number; lines: string[]; dy: number } | null {
  const words = title.split(/\s+/).filter(Boolean)
  for (let font = Math.floor(maxFont); font >= MIN_FONT; font -= 1) {
    for (let n = 1; n <= maxLines; n += 1) {
      const blockH = n * font * LINE_H
      if (blockH > 2 * R * INSET) break // taller line counts only get worse

      // Centre of the text block, relative to the circle's centre, clamped so
      // the block always stays inside the circle however many lines it takes.
      const dy =
        placement === 'top'
          ? -Math.min(R * TOP_BAND, R * INSET - blockH / 2)
          : 0
      // The line furthest from the centre is the one with the narrowest chord.
      const worst = Math.abs(dy) + blockH / 2 - (font * LINE_H) / 2
      if (worst >= R * INSET) continue
      const chord =
        2 * Math.sqrt(Math.max(R * R * INSET * INSET - worst * worst, 1))

      const maxChars = Math.floor(chord / (font * CHAR_W))
      if (maxChars < 4) continue
      const lines = wrap(words, maxChars)
      if (lines && lines.length === n) return { font, lines, dy }
    }
  }
  return null
}

/**
 * Goal Space — the nested problem space. A problem statement is a cut through a
 * nested space: the obvious goal on top, deeper framings beneath. Click to
 * descend a level; the breadcrumb tracks the cut you have taken. Siblings at
 * each level are drawn as parallel, equally-weighted circles — choosing the
 * wrong level means solving the wrong problem.
 */
export function GoalSpace() {
  const graph = useGraph()
  const navigate = useNavigate()
  const params = useParams()
  const deepSlug = params['*'] || null

  const tree = useMemo(() => (graph ? buildTree(graph) : null), [graph])

  const packed = useMemo(() => {
    if (!tree) return null
    const root = d3
      .hierarchy<TreeNode>(tree)
      .sum((d) => (d.children.length === 0 ? 1 : 0))
      .sort((a, b) => (a.data.title < b.data.title ? -1 : 1))
    return d3.pack<TreeNode>().size([SIZE, SIZE]).padding(SIZE * 0.03)(root)
  }, [tree])

  // Focus node: the deep-linked goal, else the synthetic root.
  const [focusSlug, setFocusSlug] = useState<string>(ROOT)
  const activeFocus = deepSlug ?? focusSlug

  if (!graph) return null
  const goals = graph.goals()

  if (goals.length === 0 || !packed) {
    return (
      <div>
        <ViewHeader move="Define the problem" title="Goal Space" />
        <EmptyState
          title="No goals in this export yet"
          hint={
            <>
              Nodes tagged <code className="font-mono">layer: goal</code>, nested
              via <code className="font-mono">parent</code>, will render here as a
              zoomable problem space showing each level of the nest.
            </>
          }
        />
      </div>
    )
  }

  const nodesBySlug = new Map(packed.descendants().map((n) => [n.data.slug, n]))
  const focusNode = nodesBySlug.get(activeFocus) ?? packed
  const focusPage = focusNode.data.page

  // Zoom transform so the focus circle fills the viewport.
  const k = SIZE / (focusNode.r * 2)
  const tx = SIZE / 2 - focusNode.x * k
  const ty = SIZE / 2 - focusNode.y * k

  const path = focusPage ? graph.goalPath(focusPage.slug) : []

  // Every real circle, once, in one list — both render passes walk it.
  const drawn = packed.descendants().filter((n) => n.data.slug !== ROOT)

  function focus(slug: string) {
    if (slug === ROOT) {
      setFocusSlug(ROOT)
      navigate('/goals')
    } else {
      setFocusSlug(slug)
      navigate(`/goals/${slug}`)
    }
  }

  return (
    <div>
      <ViewHeader move="Define the problem" title="Goal Space">
        “7.5°” is the obvious goal. Underneath sits water deprivation; underneath
        that, mortality and its politics; deeper still, the capability to respond
        at all. One problem statement is a single cut through this nest. Descend
        to see the framings you would otherwise miss.
      </ViewHeader>

      <Breadcrumb path={path} onRoot={() => focus(ROOT)} onFocus={focus} />

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="overflow-hidden rounded border border-line bg-surface">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="h-auto w-full"
            role="img"
            aria-label="Nested goal space"
          >
            <g
              style={{
                transform: `translate(${tx}px, ${ty}px) scale(${k})`,
                transition: 'transform var(--motion-slow) var(--ease)',
              }}
            >
              {/* Pass 1 — every circle. Drawn first, as a group, so that no
                  circle can ever paint over a label. Interleaving them is why
                  "Hold warming to 1.5°C" sat underneath its own children. */}
              {drawn.map((n) => {
                const isFocus = n.data.slug === activeFocus
                const isChildOfFocus = n.parent?.data.slug === activeFocus
                return (
                  <circle
                    key={n.data.slug}
                    cx={n.x}
                    cy={n.y}
                    r={n.r}
                    onClick={(e) => {
                      e.stopPropagation()
                      focus(n.data.slug)
                    }}
                    style={{ cursor: 'pointer' }}
                    fill="var(--color-surface-raised)"
                    /* Was 0.35 + depth*0.12, which stacked to near-opaque at
                       depth 3 and washed the nest out. A flat, low value keeps
                       every level legible however deep the tree goes. */
                    fillOpacity={0.28}
                    stroke={
                      isFocus || isChildOfFocus
                        ? 'var(--color-accent)'
                        : 'var(--color-line-strong)'
                    }
                    strokeWidth={(isFocus ? 2 : 1) / k}
                  >
                    {/* So a circle too small to label is still identifiable. */}
                    <title>{n.data.title}</title>
                  </circle>
                )
              })}

              {/* Pass 2 — every label that fits, above all circles. */}
              <g style={{ pointerEvents: 'none' }}>
                {drawn.map((n) => {
                  const R = n.r * k // screen radius
                  if (R < 18) return null // too small to label legibly at all
                  const isFocus = n.data.slug === activeFocus
                  const hasChildren = !!n.children?.length

                  const fit = hasChildren
                    ? fitLabel(n.data.title, R, 'top', 15, 3)
                    : fitLabel(n.data.title, R, 'centre', 20, 4)
                  if (!fit) return null

                  const blockH = fit.lines.length * fit.font * LINE_H
                  // First baseline, converted from screen px back to pack units.
                  const topY =
                    n.y + (fit.dy - blockH / 2 + fit.font * 0.85) / k

                  return (
                    <text
                      key={n.data.slug}
                      x={n.x}
                      textAnchor="middle"
                      style={{
                        fontSize: `${fit.font / k}px`,
                        fill: isFocus
                          ? 'var(--color-ink)'
                          : hasChildren
                            ? 'var(--color-ink-muted)'
                            : 'var(--color-ink)',
                        fontFamily: 'var(--font-sans)',
                        fontWeight: hasChildren ? 500 : 400,
                        /* A halo, so a label crossing a circle's stroke stays
                           readable in either theme. */
                        stroke: 'var(--color-surface)',
                        strokeWidth: 3 / k,
                        paintOrder: 'stroke',
                      }}
                    >
                      {fit.lines.map((line, i) => (
                        <tspan
                          key={line + i}
                          x={n.x}
                          y={topY + (i * fit.font * LINE_H) / k}
                        >
                          {line}
                        </tspan>
                      ))}
                    </text>
                  )
                })}
              </g>
            </g>
          </svg>
        </div>

        <aside>
          <GoalDetail
            page={focusPage}
            childCount={focusNode.children?.length ?? focusNode.data.children.length}
            onDescend={focus}
          />
        </aside>
      </div>
    </div>
  )
}

function Breadcrumb({
  path,
  onRoot,
  onFocus,
}: {
  path: Page[]
  onRoot: () => void
  onFocus: (slug: string) => void
}) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
      <button type="button" onClick={onRoot} className="hover:text-accent">
        The problem space
      </button>
      {path.map((p) => (
        <span key={p.slug} className="flex items-center gap-1.5">
          <span className="text-ink-faint">→</span>
          <button
            type="button"
            onClick={() => onFocus(p.slug)}
            className="hover:text-accent"
          >
            {p.title}
          </button>
        </span>
      ))}
    </nav>
  )
}
