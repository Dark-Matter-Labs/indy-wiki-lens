import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="mx-auto max-w-measure py-24 text-center">
      <p className="font-serif text-3xl text-ink">Not here</p>
      <p className="mt-3 text-ink-muted">
        There is no page at this address in the current export.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block text-sm text-accent underline underline-offset-2"
      >
        Return to the start
      </Link>
    </div>
  )
}
