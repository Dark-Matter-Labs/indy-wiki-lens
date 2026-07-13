import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MatchingData } from './Matching'
import type { Page } from '@/adapters/types'

const W = 960
const ROW_H = 88
const BOX_W = 196
const BOX_H = 60
const TOP = 48
const DEMAND_CX = 148
const SUPPLY_CX = W - 148
const ACC_CX = W / 2
const ACC_W = 184
const ACC_H = 76

interface Box {
  x: number
  y: number
  w: number
  h: number
  cx: number
  cy: number
}

function box(cx: number, cy: number, w: number, h: number): Box {
  return { x: cx - w / 2, y: cy - h / 2, w, h, cx, cy }
}

function link(a: Box, b: Box, side: 'lr'): string {
  // a right edge -> b left edge
  const x1 = a.x + a.w
  const y1 = a.cy
  const x2 = b.x
  const y2 = b.cy
  const mx = (x1 + x2) / 2
  return side === 'lr'
    ? `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
    : ''
}

/**
 * Two-sided matching diagram. Constructed demand on the left, supply on the
 * right, the accelerator as the matching function between them, and the capital
 * pool feeding it from below. Step through to watch a single match form:
 * demand → accelerator → matched supply, funded by the pool.
 */
export function MatchingDiagram({ matching }: { matching: MatchingData }) {
  const navigate = useNavigate()
  const { demand, supply, accelerator, capital } = matching
  const [step, setStep] = useState(-1) // -1 idle; else active demand index

  const n = Math.max(demand.length, supply.length, 1)
  const contentH = n * ROW_H
  const H = TOP + contentH + 140

  const accCy = TOP + contentH / 2
  const accBox = box(ACC_CX, accCy, ACC_W, ACC_H)
  const capBox = box(ACC_CX, accCy + contentH / 2 + 90, ACC_W, BOX_H)

  const dStart = TOP + (contentH - demand.length * ROW_H) / 2
  const sStart = TOP + (contentH - supply.length * ROW_H) / 2
  const demandBoxes = demand.map((_, i) =>
    box(DEMAND_CX, dStart + i * ROW_H + ROW_H / 2, BOX_W, BOX_H),
  )
  const supplyBoxes = supply.map((_, i) =>
    box(SUPPLY_CX, sStart + i * ROW_H + ROW_H / 2, BOX_W, BOX_H),
  )

  const activeDemand = step
  const activeSupply =
    step >= 0 && supply.length > 0 ? step % supply.length : -1

  const caption =
    step < 0
      ? 'Idle. The accelerator holds an open matching function — no fixed price list.'
      : `Match ${step + 1}: “${demand[step]?.title}” is paired, through the accelerator, with “${supply[activeSupply]?.title}”. Capital settles against the outcome, not the output.`

  function advance() {
    setStep((s) => (s + 1) % demand.length)
  }

  const isDim = (kind: 'demand' | 'supply' | 'acc' | 'cap', i = -1) => {
    if (step < 0) return false
    if (kind === 'demand') return i !== activeDemand
    if (kind === 'supply') return i !== activeSupply
    return false
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {demand.length > 0 && (
          <button
            type="button"
            onClick={advance}
            className="rounded-sm border border-accent bg-accent px-3 py-1 text-sm font-medium text-accent-contrast"
          >
            {step < 0 ? 'Play a match' : 'Next match'}
          </button>
        )}
        {step >= 0 && (
          <button
            type="button"
            onClick={() => setStep(-1)}
            className="rounded-sm border border-line px-3 py-1 text-sm text-ink-muted hover:text-ink"
          >
            Reset
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded border border-line bg-surface">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full min-w-[720px]"
          role="img"
          aria-label="Two-sided matching diagram: demand, accelerator, supply, capital pool"
        >
          <style>{`
            .flow { stroke-dasharray: 6 5; animation: flow 1s linear infinite; }
            @keyframes flow { to { stroke-dashoffset: -22; } }
            @media (prefers-reduced-motion: reduce) { .flow { animation: none; } }
          `}</style>

          {/* Column headers */}
          <text x={DEMAND_CX} y={22} textAnchor="middle" className="dgm-eyebrow">
            CONSTRUCTED DEMAND
          </text>
          <text x={SUPPLY_CX} y={22} textAnchor="middle" className="dgm-eyebrow">
            SUPPLY CAPACITY
          </text>

          {/* Connectors: demand -> accelerator */}
          {demandBoxes.map((b, i) => {
            const active = step >= 0 && i === activeDemand
            return (
              <path
                key={`d-${i}`}
                d={link(b, accBox, 'lr')}
                fill="none"
                stroke={active ? 'var(--color-accent)' : 'var(--color-line-strong)'}
                strokeWidth={active ? 2 : 1}
                className={active ? 'flow' : ''}
                opacity={step >= 0 && !active ? 0.25 : 0.8}
              />
            )
          })}
          {/* accelerator -> supply */}
          {supplyBoxes.map((b, i) => {
            const active = step >= 0 && i === activeSupply
            return (
              <path
                key={`s-${i}`}
                d={link(accBox, b, 'lr')}
                fill="none"
                stroke={active ? 'var(--color-accent)' : 'var(--color-line-strong)'}
                strokeWidth={active ? 2 : 1}
                className={active ? 'flow' : ''}
                opacity={step >= 0 && !active ? 0.25 : 0.8}
              />
            )
          })}
          {/* capital -> accelerator (vertical) */}
          <path
            d={`M ${capBox.cx} ${capBox.y} L ${accBox.cx} ${accBox.y + accBox.h}`}
            fill="none"
            stroke="var(--color-accent-muted)"
            strokeWidth={1.5}
            className={step >= 0 ? 'flow' : ''}
            opacity={0.8}
          />

          {/* Nodes */}
          {demand.map((p, i) => (
            <NodeBox
              key={p.slug}
              b={demandBoxes[i]}
              page={p}
              accent={step >= 0 && i === activeDemand}
              dim={isDim('demand', i)}
              onClick={() => navigate(`/p/${p.slug}`)}
            />
          ))}
          {supply.map((p, i) => (
            <NodeBox
              key={p.slug}
              b={supplyBoxes[i]}
              page={p}
              accent={step >= 0 && i === activeSupply}
              dim={isDim('supply', i)}
              onClick={() => navigate(`/p/${p.slug}`)}
            />
          ))}

          {/* Accelerator */}
          <g
            onClick={() => accelerator && navigate(`/p/${accelerator.slug}`)}
            style={{ cursor: accelerator ? 'pointer' : 'default' }}
          >
            <rect
              x={accBox.x}
              y={accBox.y}
              width={accBox.w}
              height={accBox.h}
              rx={4}
              fill="var(--color-surface)"
              stroke="var(--color-accent)"
              strokeWidth={2}
            />
            <text
              x={accBox.cx}
              y={accBox.cy - 8}
              textAnchor="middle"
              className="dgm-eyebrow"
              fill="var(--color-accent)"
            >
              MATCHING FUNCTION
            </text>
            <text
              x={accBox.cx}
              y={accBox.cy + 12}
              textAnchor="middle"
              className="dgm-title"
            >
              {truncate(accelerator?.title ?? 'Outcome accelerator', 22)}
            </text>
          </g>

          {/* Capital pool */}
          <g
            onClick={() => capital && navigate(`/p/${capital.slug}`)}
            style={{ cursor: capital ? 'pointer' : 'default' }}
          >
            <rect
              x={capBox.x}
              y={capBox.y}
              width={capBox.w}
              height={capBox.h}
              rx={4}
              fill="var(--color-surface)"
              stroke="var(--color-accent-muted)"
              strokeWidth={1.5}
            />
            <text x={capBox.cx} y={capBox.cy + 4} textAnchor="middle" className="dgm-title">
              {truncate(capital?.title ?? 'Capital pool', 24)}
            </text>
          </g>

          <style>{`
            .dgm-eyebrow { font-family: var(--font-sans); font-size: 10px; letter-spacing: 0.08em; fill: var(--color-ink-faint); }
            .dgm-title { font-family: var(--font-sans); font-size: 13px; font-weight: 600; fill: var(--color-ink); }
          `}</style>
        </svg>
      </div>

      <p className="mt-3 max-w-measure text-sm text-ink-muted">{caption}</p>
    </div>
  )
}

function NodeBox({
  b,
  page,
  accent,
  dim,
  onClick,
}: {
  b: Box
  page: Page
  accent: boolean
  dim: boolean
  onClick: () => void
}) {
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }} opacity={dim ? 0.3 : 1}>
      <rect
        x={b.x}
        y={b.y}
        width={b.w}
        height={b.h}
        rx={4}
        fill="var(--color-surface)"
        stroke={accent ? 'var(--color-accent)' : 'var(--color-line-strong)'}
        strokeWidth={accent ? 2 : 1}
      />
      <text x={b.cx} y={b.cy + 4} textAnchor="middle" className="dgm-title">
        {truncate(page.title, 24)}
      </text>
    </g>
  )
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
