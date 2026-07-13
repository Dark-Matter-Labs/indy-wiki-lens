import { useState, type ReactNode } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useGraph } from '@/lib/graph'
import { useOverlay } from '@/lib/overlay'
import { SearchDialog } from './SearchDialog'

/**
 * The five views are the five moves of the persuasion sequence, in order.
 * The nav makes that sequence legible so a stranger can walk it unaided.
 */
const NAV = [
  { to: '/goals', label: 'Goal Space', move: 'Define the problem' },
  { to: '/portfolio', label: 'Portfolio', move: "Show it's possible" },
  { to: '/how', label: 'The How', move: 'Show how' },
  { to: '/sequence', label: 'Sequence', move: 'Show when' },
  { to: '/feed', label: 'Reflections', move: 'The testing ground' },
]

export function Layout({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      <Header onSearch={() => setSearchOpen(true)} />
      <main className="mx-auto w-full max-w-content flex-1 px-gutter py-10">
        {children}
      </main>
      <Footer />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

function Header({ onSearch }: { onSearch: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-content items-center gap-6 px-gutter py-3">
        <Link to="/" className="shrink-0 leading-none">
          <span className="font-serif text-lg tracking-tight">The Lens</span>
        </Link>

        <nav className="hidden flex-1 items-stretch gap-1 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group relative rounded px-3 py-1.5 text-sm transition-colors duration-fast ${
                  isActive
                    ? 'text-ink'
                    : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="block font-medium">{item.label}</span>
                  <span className="block text-[0.65rem] leading-tight text-ink-faint">
                    {item.move}
                  </span>
                  {isActive && (
                    <span className="absolute inset-x-3 -bottom-[13px] h-px bg-accent" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onSearch}
            className="rounded border border-line px-2.5 py-1.5 text-sm text-ink-muted transition-colors duration-fast hover:border-line-strong hover:text-ink"
          >
            Search
          </button>
          <AssumptionsToggle />
        </div>
      </div>
      <MobileNav />
    </header>
  )
}

function MobileNav() {
  return (
    <nav className="flex gap-1 overflow-x-auto border-t border-line px-gutter py-2 md:hidden">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `whitespace-nowrap rounded px-2.5 py-1 text-sm ${
              isActive ? 'bg-surface text-ink' : 'text-ink-muted'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

/** The persistent Assumptions overlay control — present on every view. */
export function AssumptionsToggle() {
  const { active, toggle } = useOverlay()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      className={`rounded border px-2.5 py-1.5 text-sm font-medium transition-colors duration-fast ${
        active
          ? 'border-accent bg-accent text-accent-contrast'
          : 'border-line text-ink-muted hover:border-line-strong hover:text-ink'
      }`}
      title="Reveal the assumptions each element rests on"
    >
      Assumptions
    </button>
  )
}

function Footer() {
  const graph = useGraph()
  const exportedAt = graph?.meta.exportedAt
  const when = exportedAt
    ? new Date(exportedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-content flex-col gap-2 px-gutter py-6 text-sm text-ink-faint sm:flex-row sm:items-center sm:justify-between">
        <p>
          {when ? (
            <>Knowledge as of {when}.</>
          ) : (
            <>A lens over a living knowledge graph.</>
          )}
          {graph?.meta.isFixture && (
            <span className="ml-2 rounded-sm border border-line px-1.5 py-0.5 text-xs">
              development fixture — not live wiki data
            </span>
          )}
        </p>
        <nav className="flex gap-4">
          <Link to="/axioms" className="hover:text-ink">
            Axioms
          </Link>
          <Link to="/" className="hover:text-ink">
            Start
          </Link>
        </nav>
      </div>
    </footer>
  )
}
