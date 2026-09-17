/**
 * Tests for the one thing fetch-data.mjs refuses to do: publish the development
 * fixture as if it were the wiki.
 *
 * The failure it closes is silent by construction. A token expires or gets renamed, the
 * fetch is skipped, the fixture is copied, the build exits 0, and the site serves 32
 * fictional nodes under a green deploy with nothing anywhere saying so. Nobody reads a
 * successful build log, which is why this has to fail rather than warn.
 *
 * Case 5 mutates the refusal away and asserts case 1 stops failing, so a guard that
 * quietly stops working fails this file rather than passing it.
 *
 * Usage: npm run test:fetch
 */
import { writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SCRIPT = join(__dirname, 'fetch-data.mjs')
const OUT = join(ROOT, 'public/data/wiki.json')
/* Each lens reads a different variable — GITHUB_TOKEN here, XCO_GITHUB_TOKEN and
 * LS_GITHUB_TOKEN in the siblings. The guard has to name the one this repo reads,
 * or the message sends whoever hits it to the wrong setting. */
const TOKEN_VAR = 'GITHUB_TOKEN'

/** Run fetch-data with a clean env, restoring whatever wiki.json was there. */
function run(env, script = SCRIPT) {
  const had = existsSync(OUT) ? readFileSync(OUT) : null
  try {
    const r = spawnSync('node', [script], {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        // every host and token signal starts unset; each case opts in
        ...env,
      },
    })
    return { code: r.status, out: `${r.stdout}${r.stderr}` }
  } finally {
    if (had) writeFileSync(OUT, had)
    else if (existsSync(OUT)) rmSync(OUT)
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

process.stdout.write('1. CI, no token — must refuse the fixture\n')
{
  const { code, out } = run({ CI: '1' })
  check('exits non-zero', code !== 0, `code=${code}`)
  check('says it is refusing', /refusing to publish the development fixture/i.test(out), out.trim())
  check('names the way out', out.includes('USE_SAMPLE_DATA=1'), out.trim())
  check(`names ${TOKEN_VAR}`, out.includes(TOKEN_VAR), out.trim())
}

process.stdout.write('2. Netlify, no token — same refusal\n')
{
  const { code, out } = run({ NETLIFY: 'true', CONTEXT: 'production' })
  check('exits non-zero', code !== 0, `code=${code}`)
  check('names the context', out.includes('production'), out.trim())
}

process.stdout.write('3. hosted, but USE_SAMPLE_DATA=1 — deliberate, so allowed\n')
{
  const { code, out } = run({ CI: '1', USE_SAMPLE_DATA: '1' })
  check('exits zero', code === 0, out.trim())
  check('served the fixture', /from fixture/.test(out), out.trim())
}

process.stdout.write('4. laptop, no token — fixture is a convenience, not a lie\n')
{
  const { code, out } = run({})
  check('exits zero', code === 0, out.trim())
  check('served the fixture', /from fixture/.test(out), out.trim())
}

process.stdout.write('5. MUTATION: delete the refusal, case 1 must stop failing\n')
{
  const needle = '  if (HOSTED && !deliberate) {'
  const src = readFileSync(SCRIPT, 'utf8')
  if (!src.includes(needle)) {
    check('mutation anchor present', false, 'the guard this file claims to test is not there')
  } else {
    /* The mutant lives BESIDE the real script, not in a temp directory. fetch-data
     * resolves ROOT from import.meta.url, so a copy run from /tmp looks for the fixture
     * under /tmp, fails to find it, and exits 1 — which reads exactly like the guard
     * firing. The first draft of this test did that and reported a passing mutation as
     * a failure; it could as easily have gone the other way. A mutant has to differ from
     * the original in one thing only. */
    const mutant = join(__dirname, '.fetch-data.mutant.mjs')
    try {
      writeFileSync(mutant, src.replace(needle, '  if (false && !deliberate) {'))
      const { code, out } = run({ CI: '1' }, mutant)
      check(
        'mutant serves the fixture instead of refusing',
        code === 0 && /from fixture/.test(out),
        `code=${code} out=${out.trim()} — the mutation changed nothing, so case 1 proves nothing`,
      )
    } finally {
      if (existsSync(mutant)) rmSync(mutant)
    }
  }
}

process.stdout.write(`\n${failures.length ? `FAILED: ${failures.join(', ')}` : 'all passed'}\n`)
process.exit(failures.length ? 1 : 0)
