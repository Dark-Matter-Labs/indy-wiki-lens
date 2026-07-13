# Indy Wiki Lens

An **argument interface** over [Indy Johar's LLM wiki](https://github.com/Dark-Matter-Labs/indy-llm-wiki). Not a dashboard, not a documentation site: each view makes one move in a persuasion sequence — **define the problem → show it's possible → show how → show when → expose the assumptions underneath** — built so a stranger can walk the sequence unaided.

## The five views + the overlay

| Route | View | Argument move |
|-------|------|---------------|
| `/goals` | **Goal Space** | Define the problem — the nested, multi-dimensional problem space (`layer: goal`, nested by `parent`). Zoomable circle-packing; descend a level, breadcrumb tracks the cut. Siblings are drawn as parallel framings: choosing the wrong level solves the wrong problem. |
| `/portfolio` | **Indicative Portfolio** | Show it's possible — a scannable board of `layer: portfolio` items, filterable by goal and horizon. A gestalt of plausibility. |
| `/how` | **The How** | Show how — the outcome accelerator as a dynamic matching function between constructed demand and supply, fed by a capital pool, with a static procurement counter-diagram for contrast. Step through a match forming. Plain node-link fallback always available. |
| `/sequence` | **Sequence** | Show when — horizon lanes (near / mid / far), with dependency arrows drawn only where the graph asserts a forward link across horizons. |
| `/feed` | **Reflections & Challenges** | The living testing ground — weekly deviations (deviation → wider-world connection → early signals → counterposition). The joker's counterposition briefs get a distinct rival-voice treatment. |
| `/axioms` | **Axioms** | Expose the assumptions — the load-bearing beliefs, each with honest evidence status (`evidenced` / `assumptive` / `contested`). |

Every wiki page also has a canonical route at **`/p/<slug>`** so views can deep-link into content.

The **Assumptions overlay** is a persistent toggle present on every view. When active, each element reveals which axioms it rests on (with evidence status shown honestly); selecting an axiom highlights everything downstream of it. Its secondary mode is the four-step **journey** for a single page (ontological shift → what it practically means → plausibility pathway → communication), rendered when the page body marks those steps and degrading to the plain body otherwise.

## Architecture

```
src/
  adapters/wiki.ts        # ALL data access + schema mapping. The only file that
  adapters/types.ts       #   knows the raw export shape. Views import the domain
                          #   model (Page, WikiGraph, selectors) — never Raw*.
  theme/tokens.css        # Every colour / type / spacing / motion value. Reskin
                          #   the whole site here; components consume tokens only.
  lib/                    # GraphProvider (loads the export) + OverlayProvider.
  components/
    shell/                # Layout, nav, footer, search, load states, view header.
    page/                 # Markdown renderer (wiki-links + DOMPurify).
    axiom-overlay/         # Rests-on chips, evidence legend, highlight hook.
    ui/                    # Presentational atoms (badges, empty state, eyebrow).
  views/{goalspace,portfolio,matching,sequence,feed,axioms,page,home}/
scripts/
  fetch-data.mjs          # Build-time fetch of the PUBLIC export + privacy check.
  gen-static.mjs          # Build-time sitemap.xml + robots.txt (excludes unlisted).
netlify.toml
```

**The adapter is the seam.** The export contract may change; the wiki may start encoding something differently (e.g. a structured evidence-status field instead of a `status:` tag). When that happens, only `src/adapters/wiki.ts` changes. The conventions the adapter layers on top of the raw contract (goal nesting via parent-title resolution, axiom detection + evidence status, matching roles, feed classification, sequence dependencies) are all documented at the top of that file.

**Reskinning.** A designer can restyle the entire site by editing `src/theme/tokens.css` alone — Tailwind's theme is wired to those CSS variables (see `tailwind.config.js`) and no component hard-codes a colour, size, or motion value. Light and dark schemes both ship; a `data-theme` attribute on `<html>` overrides the system preference.

## Data & privacy

The site **only ever loads `wiki.public.json`** — the public + unlisted export. Guarantees:

- **`private`** nodes are stripped from the public file entirely by the exporter. As defence in depth, `fetch-data.mjs` **fails the build** if any fetched node has `visibility: "private"`.
- **`unlisted`** pages render at their URL but are excluded from navigation, search, and the sitemap, and get a `noindex` robots meta tag.
- The schema version is checked; the app refuses to render on a major mismatch.

The full `wiki.json` (which contains private nodes) is never fetched and never committed.

## Environment variables

Set these as Netlify build environment variables (and in a local `.env` for development — see `.env.example`):

| Var | Default | Purpose |
|-----|---------|---------|
| `GITHUB_TOKEN` | — | Read-only token with access to the (private) wiki repo. Required in production. |
| `WIKI_REPO` | `Dark-Matter-Labs/indy-llm-wiki` | The wiki repository. |
| `WIKI_BRANCH` | `export` | Branch carrying the export. |
| `WIKI_PUBLIC_PATH` | `export/wiki.public.json` | Path to the public export. **Never point this at `wiki.json`.** |
| `SITE_URL` | `$URL` (Netlify) | Absolute origin, for sitemap/robots. |
| `USE_SAMPLE_DATA` | — | If truthy, build against the local dev fixture instead of fetching. |

## The deploy-hook handshake with the wiki repo

1. The wiki repo runs `tools/export.py`, producing `export/wiki.public.json` on its `export` branch.
2. On change, the wiki repo pings this site's **Netlify build hook** (`DEPLOY_HOOK`).
3. Netlify runs `npm run build`. The `prebuild` step (`fetch-data.mjs`) fetches the latest public export into `public/data/wiki.json` and runs the privacy check; `gen-static.mjs` writes `sitemap.xml` + `robots.txt`; then Vite builds the SPA.
4. The footer records the export timestamp: "knowledge as of …".

To wire it up: create a build hook in Netlify (Site settings → Build & deploy → Build hooks) and store its URL as the secret **`DEPLOY_HOOK_URL`** in the wiki repo (Settings → Secrets and variables → Actions). The wiki's `.github/workflows/export.yml` already contains the notify step — it curls that hook after force-pushing a new export, gated on the secret being present — so no workflow change is needed on either side.

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
```

With no `GITHUB_TOKEN`, `dev`/`build` fall back to the committed development fixture (`public/data/wiki.sample.json`) — clearly-synthetic sample data that exercises every view. It is labelled "development fixture — not live wiki data" in the footer. To develop against live data, put a `GITHUB_TOKEN` in `.env`.

```bash
npm run build      # prebuild fetch + privacy check + sitemap, then Vite build
npm run typecheck  # tsc project references, no emit
```

## Current state of the wiki

As of writing, the public export is nearly empty and the viz-layer tagging (`layer`, `horizon`, `parent`, axioms) is sparse — most pages are still `private`. The lens is built to be honest about this: each view renders an **empty state** naming the one thing that would light it up, rather than fabricating placeholder knowledge. The structure is ready and fills in as the wiki publishes and tags.
