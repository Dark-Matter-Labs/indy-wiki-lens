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
              {packed
                .descendants()
                .filter((n) => n.data.slug !== ROOT)
                .map((n) => {
                  const isFocus = n.data.slug === activeFocus
                  const isChildOfFocus = n.parent?.data.slug === activeFocus
                  const hasChildren = n.children && n.children.length > 0
                  return (
                    <g key={n.data.slug}>
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={n.r}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (hasChildren && !isFocus) focus(n.data.slug)
                          else focus(n.data.slug)
                        }}
                        style={{ cursor: 'pointer' }}
                        fill="var(--color-surface-raised)"
                        fillOpacity={0.35 + n.depth * 0.12}
                        stroke={
                          isFocus || isChildOfFocus
                            ? 'var(--color-accent)'
                            : 'var(--color-line-strong)'
                        }
                        strokeWidth={(isFocus ? 2 : 1) / k}
                      />
                      {(isChildOfFocus || (isFocus && !hasChildren)) && (
                        <text
                          x={n.x}
                          y={n.y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{
                            fontSize: `${Math.min(n.r / 4, 16) / k + 6}px`,
                            fill: 'var(--color-ink)',
                            pointerEvents: 'none',
                            fontFamily: 'var(--font-sans)',
                          }}
                        >
                          <tspan>{truncate(n.data.title, 22)}</tspan>
                        </text>
                      )}
                    </g>
                  )
                })}
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

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
