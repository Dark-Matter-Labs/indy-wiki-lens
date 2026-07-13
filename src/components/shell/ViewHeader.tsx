import type { ReactNode } from 'react'
import { Eyebrow } from '@/components/ui/atoms'

/** Consistent editorial header for each view: the argument move, then the claim. */
export function ViewHeader({
  move,
  title,
  children,
}: {
  move: string
  title: string
  children?: ReactNode
}) {
  return (
    <header className="mb-10 max-w-measure">
      <Eyebrow>{move}</Eyebrow>
      <h1 className="mt-2 font-serif text-4xl font-normal leading-tight tracking-tight text-ink">
        {title}
      </h1>
      <hr className="rule mb-0 mt-5 max-w-[min(100%,32rem)]" />
      {children && (
        <div className="mt-5 text-lg leading-normal text-ink-muted">
          {children}
        </div>
      )}
    </header>
  )
}
