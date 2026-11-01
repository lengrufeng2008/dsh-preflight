import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preflightTarball } from '../src/tarball.mjs'
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
test('a packed good fixture passes tarball preflight', async () => {
  const out = await mkdtemp(join(tmpdir(), 'dsh-preflight-tgz-'))
  try {
    const name = execFileSync('npm', ['pack', '--pack-destination', out], { cwd: join(ROOT, 'test/fixtures/good'), encoding: 'utf8' }).trim().split('\n').pop()
    const report = preflightTarball(join(out, name))
    assert.equal(report.verdict, 'PASS')
    assert.equal(report.package.name, 'good-fixture')
  } finally { await rm(out, { recursive: true, force: true }) }
})
