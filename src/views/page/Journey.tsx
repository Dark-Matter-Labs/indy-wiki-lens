import { Markdown } from '@/components/page/Markdown'
import type { Journey as JourneyModel } from '@/adapters/types'

const STEPS: Array<{ key: keyof JourneyModel; label: string; move: string }> = [
  { key: 'ontologicalShift', label: 'Ontological shift', move: 'What changes in how we see' },
  { key: 'indicators', label: 'What it practically means', move: 'The indicators' },
  { key: 'plausibilityPathway', label: 'Plausibility pathway', move: 'How it becomes real' },
  { key: 'communication', label: 'Communication', move: 'How we say it' },
]

/**
 * The secondary axiom-overlay mode: a single page's journey rendered as four
 * steps — ontological shift → what it means → plausibility pathway →
 * communication. Only the steps present are shown; the caller only reaches here
 * when at least one step parsed (otherwise it degrades to the plain body).
 */
export function Journey({
  journey,
  body,
}: {
  journey: JourneyModel
  body: string
}) {
  const present = STEPS.filter((s) => journey[s.key])
  return (
    <div>
      <ol className="flex flex-col gap-px overflow-hidden rounded border border-line bg-line">
        {present.map((step, i) => (
          <li key={step.key} className="bg-surface p-5">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-sm text-accent">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="font-medium text-ink">{step.label}</p>
                <p className="text-xs text-ink-faint">{step.move}</p>
              </div>
            </div>
            <div className="mt-3 pl-8">
              <Markdown body={journey[step.key] ?? ''} className="prose text-base" />
            </div>
          </li>
        ))}
      </ol>
      <details className="mt-6 text-sm text-ink-faint">
        <summary className="cursor-pointer hover:text-ink">Full page text</summary>
        <div className="mt-4">
          <Markdown body={body} />
        </div>
      </details>
    </div>
  )
}
