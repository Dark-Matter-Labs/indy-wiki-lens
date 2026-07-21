import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGraph } from '@/lib/graph'
import { ViewHeader } from '@/components/shell/ViewHeader'
import { Eyebrow } from '@/components/ui/atoms'
import {
  computeLearningSystem,
  modulesForStage,
} from '@/adapters/learningSystem'
import type { StageState } from '@/adapters/learningSystem'

/**
 * The Learning System — QNO's signal loop (00 Onboarding → 06 Inputs) laid live
 * over the wiki. Each stage binds to an existing lens view and shows a live
 * count, so the spine reflects what is actually moving. Two toggles mirror the
 * QNO mock-up: the attached modules and the human thread.
 */
export function Learning() {
  const graph = useGraph()
  const states = useMemo(
    () => (graph ? computeLearningSystem(graph) : []),
    [graph],
  )
  const [showModules, setShowModules] = useState(false)
  const [showThread, setShowThread] = useState(false)
  if (!graph) return null

  return (
    <div>
      <ViewHeader move="Trace the signal's path" title="The Learning System">
        The full path a signal takes — from a named failure mode to a resourced
        intervention, and back again. This is Question-Native Organising's
        seven-stage loop laid over the wiki: each stage is a live lens view, and
        its <span className="text-ink">Knowledge Engine is the{' '}
          <Link to="/ladder" className="text-accent hover:underline">
            Ladder
          </Link></span>.
      </ViewHeader>

      <div className="mx-auto max-w-content">
        <div className="mb-8 flex flex-wrap gap-2">
          <Toggle on={showModules} onClick={() => setShowModules((v) => !v)}>
            Show attached modules
          </Toggle>
          <Toggle on={showThread} onClick={() => setShowThread((v) => !v)}>
            Show the human thread
          </Toggle>
        </div>

        {/* the spine — scrolls horizontally on narrow screens */}
        <div className="overflow-x-auto pb-3">
          <ol className="flex min-w-max items-stretch gap-2">
            {states.map((s, i) => (
              <li key={s.stage.num} className="flex items-stretch gap-2">
                <StageCard state={s} showModules={showModules} showThread={showThread} />
                {i < states.length - 1 && (
                  <span
                    className="flex items-center self-start pt-16 text-ink-faint"
                    aria-hidden
                  >
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
        <p className="mt-2 font-mono text-xs text-ink-faint">
          signal flows 06 → 00 and back; the arrows trace the pipeline order.
        </p>

        {showModules && <DisruptSlot />}

        <HonestPanel />
      </div>
    </div>
  )
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors duration-fast ${
        on
          ? 'border-accent bg-accent text-accent-contrast'
          : 'border-line text-ink-muted hover:border-line-strong hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function StageCard({
  state,
  showModules,
  showThread,
}: {
  state: StageState
  showModules: boolean
  showThread: boolean
}) {
  const { stage, count } = state
  const meta = stage.to === null
  const modules = modulesForStage(stage.num)

  const inner = (
    <>
      <div className="font-mono text-xs text-accent">{stage.num}</div>
      <h2 className="mt-1 font-serif text-xl leading-tight text-ink">
        {stage.name}
      </h2>
      <span className="mt-2 block h-0.5 w-8 rounded-full bg-accent" />
      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        {stage.definition}
      </p>
      {count !== null && (
        <p className="mt-3 font-mono text-xs text-ink-faint">
          {count} {stage.unit}
          {stage.to && <span className="text-accent"> →</span>}
        </p>
      )}
    </>
  )

  return (
    <div className="flex w-56 flex-col">
      {stage.to ? (
        <Link
          to={stage.to}
          className={`block rounded border bg-surface p-4 transition-colors duration-fast hover:border-accent ${
            meta ? 'border-dashed border-line-strong' : 'border-line'
          }`}
        >
          {inner}
        </Link>
      ) : (
        <div className="rounded border border-dashed border-line-strong bg-surface p-4">
          {inner}
        </div>
      )}

      {showModules && modules.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {modules.map((m) => (
            <li
              key={m.name}
              className="rounded-sm border border-dashed border-line px-2 py-1 font-mono text-[0.7rem] text-ink-faint"
            >
              + {m.name}
            </li>
          ))}
        </ul>
      )}

      {showThread && (
        <p className="mt-2 rounded-sm border-l-2 border-accent-muted bg-surface px-2.5 py-2 text-xs leading-snug text-ink-muted">
          ◆ {stage.role}
        </p>
      )}
    </div>
  )
}

/** The intentionally-empty "disrupt" module slot — kept visible, per the note. */
function DisruptSlot() {
  return (
    <div className="mt-6 rounded border border-dashed border-line-strong bg-surface px-5 py-4">
      <Eyebrow>Disrupt module — unfilled</Eyebrow>
      <p className="mt-1 max-w-measure text-sm text-ink-muted">
        A <span className="font-mono text-xs">disrupt</span> module type exists in
        the QNO build, but nothing is tagged with it. The commissioned critiques
        argue the missing piece — refusal, absence, non-closure, relational
        knowing — is exactly what a genuinely disruptive module should carry. We
        keep the gap visible rather than badge the organisational modules as if
        they filled it.
      </p>
    </div>
  )
}

/** What this map honestly is and isn't — carrying the working note's own edges. */
function HonestPanel() {
  return (
    <div className="mt-14 border-t border-line pt-6">
      <Eyebrow>Reading this honestly</Eyebrow>
      <ul className="mt-3 flex max-w-measure flex-col gap-2.5 text-sm leading-relaxed text-ink-muted">
        <li>
          <span className="text-ink">Derived, not declared.</span> The wiki has
          no <span className="font-mono text-xs">stage</span> field; each stage is
          inferred from the layer the lens already trusts. An explicit tag would
          make it exact.
        </li>
        <li>
          <span className="text-ink">Read, not run.</span> This shows knowledge{' '}
          <em>flowing through</em> the stages, but a real assumption is still
          entered, gated and promoted on the write side (the Persona pipeline) —
          not in this map. It is closer to a capability view than a capacity one.
        </li>
        <li>
          <span className="text-ink">Open edges the working note names.</span> No
          refusal path (“I’d rather not say” as a first-class outcome), no
          absence entry point before an assumption is surfaced, and no
          reciprocity — nothing yet returns to whoever first supplied a signal.
        </li>
        <li>
          <span className="text-ink">Interim, by design.</span> Version 1 is a
          hypothesis about how base and disruption relate, not a refined claim —
          held provisionally, on purpose.
        </li>
      </ul>
    </div>
  )
}
