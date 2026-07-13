import { useGraph } from '@/lib/graph'

/**
 * The dusk masthead — the framework's signature scene, used once, on Home.
 * A low ember sun over a horizon, water doubling it below. Purely atmospheric
 * (the lens does not carry the persona-app's horizon/thread semantics); it sets
 * the register. All colour comes from tokens; the shimmer is reduced-motion
 * gated. Content-free scene elements are aria-hidden.
 */
export function Masthead() {
  const graph = useGraph()
  const exportedAt = graph?.meta.exportedAt
  const when = exportedAt
    ? new Date(exportedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <div className="mh">
      <style>{`
        .mh {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--color-line);
          border-radius: var(--radius-lg);
          min-height: 420px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          background: linear-gradient(180deg, #4a666f 0%, #3c555e 42%, #2c4149 60%, #22343b 100%);
        }
        :root[data-theme='light'] .mh,
        .mh { color: #f5efe2; }
        .mh-sunwrap { position: absolute; left: 0; right: 0; top: 0; height: 60%; overflow: hidden; }
        .mh-sun {
          position: absolute; left: 50%; transform: translateX(-50%); bottom: -120px;
          width: 240px; height: 240px; border-radius: 50%;
          background: radial-gradient(circle at 50% 32%, #ff9a64 0%, #ff7043 45%, var(--color-sun) 100%);
          box-shadow: 0 0 90px 18px rgba(244, 80, 46, 0.28);
        }
        .mh-horizon { position: absolute; left: 0; right: 0; top: 60%; height: 1px; background: rgba(233, 222, 198, 0.35); }
        .mh-water { position: absolute; left: 0; right: 0; top: calc(60% + 1px); bottom: 0;
          background: linear-gradient(180deg, #1e3037 0%, #14232a 100%); }
        .mh-reflection {
          position: absolute; left: 50%; transform: translateX(-50%); top: 0; width: 200px; height: 110px;
          background: radial-gradient(ellipse at 50% 0%, rgba(255, 112, 67, 0.45) 0%, rgba(244, 80, 46, 0.16) 55%, transparent 75%);
          filter: blur(6px);
        }
        @media (prefers-reduced-motion: no-preference) {
          .mh-reflection { animation: mh-shimmer 7s ease-in-out infinite alternate; }
          @keyframes mh-shimmer {
            from { opacity: 0.75; transform: translateX(-50%) scaleY(1); }
            to { opacity: 1; transform: translateX(-50%) scaleY(1.08); }
          }
        }
        .mh-inner { position: relative; z-index: 2; padding: 0 clamp(1.5rem, 4vw, 3rem) clamp(1.5rem, 4vw, 2.5rem); }
        .mh-kicker {
          font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.22em;
          text-transform: uppercase; color: #e9dec6; opacity: 0.85;
        }
        .mh-h1 {
          font-family: var(--font-serif); font-weight: 300; font-size: clamp(38px, 6vw, 64px);
          line-height: 1.04; margin: 0.35rem 0 0; color: #f5efe2; letter-spacing: -0.01em;
        }
        .mh-h1 em { font-style: italic; color: var(--color-sun-2); }
        .mh-sub { margin-top: 0.75rem; max-width: 44ch; color: #b7c4c6; font-size: 15px; line-height: 1.6; }
        .mh-meta {
          margin-top: 1.25rem; display: flex; gap: 1.75rem; flex-wrap: wrap;
          font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.06em; color: #9fb4b8;
        }
        .mh-meta b { color: #e9dec6; font-weight: 500; }
      `}</style>

      <div className="mh-sunwrap" aria-hidden>
        <div className="mh-sun" />
      </div>
      <div className="mh-horizon" aria-hidden />
      <div className="mh-water" aria-hidden>
        <div className="mh-reflection" />
      </div>

      <div className="mh-inner">
        <p className="mh-kicker">The Lens · Argument interface</p>
        <h1 className="mh-h1">
          A way to walk the <em>argument</em>.
        </h1>
        <p className="mh-sub">
          Define the problem, show it is possible, show how, show when — and,
          underneath all of it, expose the assumptions the whole thing rests on.
        </p>
        <div className="mh-meta">
          {when && (
            <div>
              <b>Knowledge as of</b> {when}
            </div>
          )}
          {graph && (
            <div>
              <b>Pages</b> {graph.meta.nodeCount}
            </div>
          )}
          <div>
            <b>Sequence</b> five moves
          </div>
        </div>
      </div>
    </div>
  )
}
