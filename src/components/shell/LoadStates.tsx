import { SchemaMismatchError } from '@/adapters/wiki'

export function LoadingScreen() {
  return (
    <div className="mx-auto max-w-measure py-24 text-center text-ink-faint">
      <p className="text-sm">Loading the knowledge graph…</p>
    </div>
  )
}

export function LoadError({ error }: { error: Error }) {
  const isSchema = error instanceof SchemaMismatchError
  return (
    <div className="mx-auto max-w-measure rounded border border-contested/40 bg-surface px-6 py-12">
      <p className="font-serif text-2xl text-ink">
        {isSchema ? 'The data speaks a newer dialect' : 'The data could not be loaded'}
      </p>
      <p className="mt-3 text-sm text-ink-muted">{error.message}</p>
      {isSchema && (
        <p className="mt-3 text-sm text-ink-muted">
          The wiki export changed shape in a way this lens does not yet
          understand. Update <code className="font-mono">src/adapters/wiki.ts</code>{' '}
          to the new contract.
        </p>
      )}
    </div>
  )
}
