/**
 * Tests for the one thing archive-snapshot.mjs refuses to do: continue another
 * wiki's history as if it were this one's.
 *
 * Written because the guard it covers was added after two months of the learning-system
 * lens plotting indy-llm-wiki's corpus. A guard with no test is a guard nobody has seen
 * fire, and the last three defects in this federation were all checks that could not
 * fire. Case 6 mutates the refusal away and asserts case 1 stops failing, so a guard
 * that quietly stops working fails this file rather than passing it.
 *
 * Usage: npm run test:archive
 */
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SCRIPT = join(__dirname, 'archive-snapshot.mjs')

const A = 'Dark-Matter-Labs/indy-llm-wiki'
const B = 'Dark-Matter-Labs/xco-team-wiki'

const SEED = [
  {
    at: '2026-08-21T06:31:22.446Z',
    exportedAt: '',
    hash: 'deadbeefdeadbeef',
    pages: 290,
    links: 0,
    tags: 0,
    axioms: 0,
    avgDegree: 0,
    vec: {},
    centers: [],
  },
]

const exportFrom = (repo, pages = 3) => ({
  meta: {
    kind: 'public',
    exported_at: '2026-09-17T00:00:00Z',
    source_repo: repo,
    source_branch: 'export',
  },
  nodes: Array.from({ length: pages }, (_, i) => ({
    slug: `p${i}`,
    type: 'concept',
    visibility: 'public',
    tags: ['t'],
    outbound_links: [],
    inbound_links: [],
  })),
})

function run(history, data, script = SCRIPT) {
  const dir = mkdtempSync(join(tmpdir(), 'archive-test-'))
  const exportPath = join(dir, 'export.json')
  const historyPath = join(dir, 'history.json')
  writeFileSync(exportPath, JSON.stringify(data))
  if (history !== null) writeFileSync(historyPath, JSON.stringify(history))
  const r = spawnSync('node', [script, exportPath, historyPath], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  return {
    code: r.status,
    out: `${r.stdout}${r.stderr}`,
    after: existsSync(historyPath) ? JSON.parse(readFileSync(historyPath, 'utf8')) : null,
  }
}

const failures = []
function check(name, ok, detail = '') {
  process.stdout.write(`  ${ok ? 'PASS' : 'FAIL'}  ${name}\n`)
  if (!ok) {
    if (detail) process.stdout.write(`        ${detail}\n`)
    failures.push(name)
  }
}

process.stdout.write('1. history stamped A, export from B — must refuse\n')
{
  const { code, out, after } = run({ schema: 1, source: A, snapshots: SEED }, exportFrom(B))
  check('exits non-zero', code !== 0, `code=${code}`)
  check('names both wikis', out.includes(A) && out.includes(B), out.trim())
  check('nothing appended', after?.snapshots.length === 1)
}

process.stdout.write('2. history stamped A, export from A — must append\n')
{
  const { code, out, after } = run({ schema: 1, source: A, snapshots: SEED }, exportFrom(A))
  check('exits zero', code === 0, out.trim())
  check('appended', after?.snapshots.length === 2)
  check('source kept', after?.source === A)
}

process.stdout.write('3. unstamped history with snapshots — adopt, and say so\n')
{
  const { code, out, after } = run({ schema: 1, snapshots: SEED }, exportFrom(A))
  check('exits zero', code === 0, out.trim())
  check('says it adopted', out.toLowerCase().includes('adopting'), out.trim())
  check('stamped now', after?.source === A)
}

process.stdout.write('4. no history file at all — starts stamped\n')
{
  const { code, out, after } = run(null, exportFrom(A))
  check('exits zero', code === 0, out.trim())
  check('stamped', after?.source === A)
}

process.stdout.write('5. export carries no source_repo — no stamp, still archives\n')
{
  const data = exportFrom(A)
  delete data.meta.source_repo
  const { code, out, after } = run({ schema: 1, snapshots: SEED }, data)
  check('exits zero', code === 0, out.trim())
  check('left unstamped', after !== null && !('source' in after))
}

process.stdout.write('6. MUTATION: delete the refusal, case 1 must stop failing\n')
{
  const needle = '  if (history.source && history.source !== source) {'
  const src = readFileSync(SCRIPT, 'utf8')
  if (!src.includes(needle)) {
    check('mutation anchor present', false, 'the guard this file claims to test is not there')
  } else {
    const mutant = join(mkdtempSync(join(tmpdir(), 'archive-mutant-')), 'mutant.mjs')
    writeFileSync(mutant, src.replace(needle, '  if (false && history.source !== source) {'))
    const { code, after } = run({ schema: 1, source: A, snapshots: SEED }, exportFrom(B), mutant)
    check(
      'mutant appends instead of refusing',
      code === 0 && after?.snapshots.length === 2,
      `code=${code} — the mutation changed nothing, so case 1 proves nothing`,
    )
  }
}

process.stdout.write(`\n${failures.length ? `FAILED: ${failures.join(', ')}` : 'all passed'}\n`)
process.exit(failures.length ? 1 : 0)
