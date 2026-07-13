import type { ReactNode } from 'react'
import type { Confidence, EvidenceStatus } from '@/adapters/types'

/** Uppercase eyebrow label naming the "argument move" a view makes. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>
}

/** A quiet metadata pill. */
export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-sm border border-line px-1.5 py-0.5 text-xs text-ink-faint">
      {children}
    </span>
  )
}

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
}
const CONFIDENCE_FILL: Record<Confidence, number> = { high: 3, medium: 2, low: 1 }

/** Three-dot confidence meter — restrained, no colour needed. */
export function ConfidenceDots({ level }: { level: Confidence }) {
  const filled = CONFIDENCE_FILL[level]
  return (
    <span
      className="inline-flex items-center gap-1"
      title={CONFIDENCE_LABEL[level]}
      aria-label={CONFIDENCE_LABEL[level]}
    >
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${
            i <= filled ? 'bg-ink-muted' : 'bg-line-strong'
          }`}
        />
      ))}
    </span>
  )
}

const EVIDENCE_LABEL: Record<EvidenceStatus, string> = {
  evidenced: 'Evidenced',
  assumptive: 'Assumptive',
  contested: 'Contested',
}
const EVIDENCE_TOKEN: Record<EvidenceStatus, string> = {
  evidenced: 'text-evidenced border-evidenced',
  assumptive: 'text-assumptive border-assumptive',
  contested: 'text-contested border-contested',
}

/**
 * Honest evidence-status badge. Shown exactly as it is — assumptive is labelled
 * assumptive, never dressed up as fact. Colour + text (not colour alone).
 */
export function EvidenceBadge({ status }: { status: EvidenceStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-xs font-medium ${EVIDENCE_TOKEN[status]}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: `var(--color-${status})` }}
        aria-hidden
      />
      {EVIDENCE_LABEL[status]}
    </span>
  )
}

/**
 * Honest empty state. When the export lacks the data a view needs, we say so
 * and name the one thing that would light it up — never fabricate placeholders.
 */
export function EmptyState({
  title,
  hint,
}: {
  title: string
  hint: ReactNode
}) {
  return (
    <div className="mx-auto max-w-measure rounded border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
      <p className="text-lg font-medium text-ink">{title}</p>
      <p className="mt-2 text-sm text-ink-muted">{hint}</p>
    </div>
  )
}
