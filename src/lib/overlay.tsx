import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * The Assumptions overlay is a cross-cutting, persistent mode that lives above
 * the routes so it survives navigation between views. When `active`, views
 * reveal which axioms each element rests on. Selecting an axiom highlights
 * everything downstream of it.
 */
interface OverlayState {
  active: boolean
  toggle: () => void
  setActive: (v: boolean) => void
  /** Currently selected axiom slug (highlights its downstream), or null. */
  selectedAxiom: string | null
  selectAxiom: (slug: string | null) => void
}

const OverlayContext = createContext<OverlayState | null>(null)

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const [selectedAxiom, setSelectedAxiom] = useState<string | null>(null)

  const toggle = useCallback(() => {
    setActive((a) => {
      const next = !a
      if (!next) setSelectedAxiom(null)
      return next
    })
  }, [])

  const selectAxiom = useCallback((slug: string | null) => {
    setSelectedAxiom(slug)
    if (slug) setActive(true)
  }, [])

  const value = useMemo<OverlayState>(
    () => ({
      active,
      toggle,
      setActive: (v) => {
        setActive(v)
        if (!v) setSelectedAxiom(null)
      },
      selectedAxiom,
      selectAxiom,
    }),
    [active, toggle, selectedAxiom, selectAxiom],
  )

  return (
    <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>
  )
}

export function useOverlay(): OverlayState {
  const ctx = useContext(OverlayContext)
  if (!ctx) throw new Error('useOverlay must be used within OverlayProvider')
  return ctx
}
