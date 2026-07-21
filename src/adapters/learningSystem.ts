/**
 * The QNO Learning System, laid live over the wiki.
 *
 * Question-Native Organising models the path a signal takes "from a named
 * failure mode to a resourced intervention — and back again" as a seven-stage
 * spine (00 Onboarding → 06 Inputs) with cross-cutting modules and a human
 * thread (who is doing the work at each stage). Its "Knowledge Engine" is the
 * five-rung Knowledge Ladder — which the lens already renders at /ladder.
 *
 * The QNO working note's own sharpest critique of the static mock-up is that it
 * is "a capability artifact, not a capacity one": it displays the ladder, but
 * no real knowledge flows through it. This module answers that by binding each
 * stage to LIVE wiki content — so the spine shows what is actually moving.
 *
 * HONEST LIMIT (same shape as /ladder and /observatory): the wiki has no
 * explicit `stage` field. Each stage is DERIVED from the layer/kind the lens
 * already trusts — goals → Problem Space, portfolio → Solution Space, etc. An
 * explicit `stage:` tag would make it exact rather than inferred. And "flowing
 * through" is read-only here: a real assumption is still entered, gated and
 * promoted on the WRITE side (the Persona pipeline), not in this map.
 */
import type { WikiGraph } from './wiki'

export interface Stage {
  num: string
  name: string
  definition: string
  /** The human thread — who is doing the work at this stage (QNO). */
  role: string
  /** Existing lens view this stage reads from, or null (meta pre-stage). */
  to: string | null
  /** Unit word for the live count. */
  unit: string
  /** How the count is derived from the graph. null → no wiki content (meta). */
  count: ((g: WikiGraph) => number) | null
}

/** The seven-stage spine, in signal order (00 → 06). */
export const STAGES: Stage[] = [
  {
    num: '00',
    name: 'Onboarding',
    definition:
      'The entry threshold — bringing a person into the system before any inquiry begins. A pre-stage, not a rung.',
    role: 'Whoever brings someone into the work.',
    to: null,
    unit: '',
    count: null,
  },
  {
    num: '01',
    name: 'Problem Space',
    definition:
      'Naming the failure mode: the entangled problem stated out loud, often for the first time. A hunch licenses inquiry — nothing more.',
    role: 'Whoever is naming the problem out loud, often for the first time.',
    to: '/goals',
    unit: 'framings',
    count: (g) => g.goals().length,
  },
  {
    num: '02',
    name: 'Solution Space',
    definition:
      'Committing to a posture, not just the language: the interventions and portfolio the problem opens onto.',
    role: 'Leadership choosing to commit to the posture, not just the language.',
    to: '/portfolio',
    unit: 'portfolio items',
    count: (g) => g.portfolio().length,
  },
  {
    num: '03',
    name: 'Engine & Control Room',
    definition:
      'The Knowledge Engine — the five-rung ladder, its gates and loops — that keeps rigour humane. This is the /ladder view.',
    role: 'The Community of Practice — the “Knowledge + Heart” that keeps rigour humane.',
    to: '/ladder',
    unit: 'pages in the engine',
    count: (g) => g.listable.length,
  },
  {
    num: '04',
    name: 'Pathways & Roles',
    definition:
      'Sequencing the work across horizons, and holding the loop between the people and the framework.',
    role: 'The named role holding the loop between people and the framework.',
    to: '/sequence',
    unit: 'on a horizon',
    count: (g) => {
      const lanes = g.horizonLanes()
      return lanes.near.length + lanes.mid.length + lanes.far.length
    },
  },
  {
    num: '05',
    name: 'Instruments',
    definition:
      'The operational machinery run in the field — the matching function, mechanisms and models that turn commitment into action.',
    role: 'The people actually running instruments in the field.',
    to: '/how',
    unit: 'mechanisms',
    count: (g) => g.mechanisms().length,
  },
  {
    num: '06',
    name: 'Inputs',
    definition:
      'Where the signal is first noticed — reflections and challenges from whoever is close enough to the work to see it. The loop closes here, and begins again.',
    role: 'Whoever is close enough to the work to notice the signal in the first place.',
    to: '/feed',
    unit: 'signals',
    count: (g) => g.reflections().length + g.challenges().length,
  },
]

export interface Module {
  name: string
  /** Stage numbers this module attaches to. */
  stages: string[]
  /** 'module' = organisational; 'disrupt' = epistemically disruptive. */
  kind: 'module' | 'disrupt'
}

/**
 * Attached modules, from the QNO mock-up. The `disrupt` slot is intentionally
 * EMPTY — the working note flags that a "disrupt" module type exists in the
 * build but nothing is tagged with it, and that the missing piece (refusal,
 * absence, non-closure, relational knowing) is exactly what a genuinely
 * disruptive module should carry. We keep that gap visible rather than hide it.
 */
export const MODULES: Module[] = [
  { name: 'System Blockers', stages: ['01'], kind: 'module' },
  { name: '3D Goaling', stages: ['02', '04'], kind: 'module' },
  { name: 'Legal Architecture', stages: ['02', '04'], kind: 'module' },
  { name: 'Human Onboarding', stages: ['03', '04'], kind: 'module' },
]

export function modulesForStage(num: string): Module[] {
  return MODULES.filter((m) => m.stages.includes(num))
}

export interface StageState {
  stage: Stage
  count: number | null
}

export function computeLearningSystem(graph: WikiGraph): StageState[] {
  return STAGES.map((stage) => ({
    stage,
    count: stage.count ? stage.count(graph) : null,
  }))
}
