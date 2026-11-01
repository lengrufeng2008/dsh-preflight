import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preflight } from '../src/preflight.mjs'
import { apply } from '../plugin/index.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
test('a clean fixture passes', async () => {
  const report = await preflight(join(ROOT, 'test/fixtures/good'))
  assert.equal(report.verdict, 'PASS')
  assert.deepEqual(report.issues, [])
  assert.equal(report.skills, 1)
})
test('a bad fixture is blocked for lifecycle, log, and missing patch', async () => {
  const report = await preflight(join(ROOT, 'test/fixtures/bad'))
  assert.equal(report.verdict, 'BLOCK')
  assert.ok(report.issues.some((i) => i.includes('lifecycle')))
  assert.ok(report.issues.some((i) => i.includes('.log')))
  assert.ok(report.issues.some((i) => i.includes('dsh.bundle.patch')))
})
test('CLI exits 0 for PASS and 1 for BLOCK', () => {
  const good = spawnSync(process.execPath, [join(ROOT, 'bin/dsh-preflight.mjs'), join(ROOT, 'test/fixtures/good')], { encoding: 'utf8' })
  assert.equal(good.status, 0)
  assert.match(good.stdout, /PASS/)
  const bad = spawnSync(process.execPath, [join(ROOT, 'bin/dsh-preflight.mjs'), join(ROOT, 'test/fixtures/bad')], { encoding: 'utf8' })
  assert.equal(bad.status, 1)
  assert.match(bad.stdout, /BLOCK/)
})
test('plugin registers plugin_preflight and plugin-preflight', async () => {
  const tools = []
  let factory
  apply({ tools: { register: (tool) => tools.push(tool) }, skills: { registerProvider: (fn) => { factory = fn } } })
  assert.equal(tools[0].name, 'plugin_preflight')
  const result = await tools[0].execute({ path: join(ROOT, 'test/fixtures/good') })
  assert.equal(result.verdict, 'PASS')
  const provider = factory()
  assert.equal((await provider.list())[0].name, 'plugin-preflight')
  assert.match((await provider.get({ name: 'plugin-preflight' })).content, /plugin_preflight/)
})
