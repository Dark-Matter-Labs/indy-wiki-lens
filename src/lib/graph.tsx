import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { loadGraph, WikiGraph } from '@/adapters/wiki'

type GraphState =
  | { status: 'loading' }
  | { status: 'ready'; graph: WikiGraph }
  | { status: 'error'; error: Error }

const GraphContext = createContext<GraphState | null>(null)

export function GraphProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GraphState>({ status: 'loading' })

  useEffect(() => {
    let alive = true
    loadGraph()
      .then((graph) => alive && setState({ status: 'ready', graph }))
      .catch((error) => alive && setState({ status: 'error', error }))
    return () => {
      alive = false
    }
  }, [])

  return <GraphContext.Provider value={state}>{children}</GraphContext.Provider>
}

/** Access the raw load state (loading / ready / error). */
export function useGraphState(): GraphState {
  const ctx = useContext(GraphContext)
  if (!ctx) throw new Error('useGraphState must be used within GraphProvider')
  return ctx
}

/**
 * Convenience: returns the graph or null while loading/errored. Use when a
 * component only renders inside an already-ready boundary.
 */
export function useGraph(): WikiGraph | null {
  const state = useGraphState()
  return state.status === 'ready' ? state.graph : null
}
