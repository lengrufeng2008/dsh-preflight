#!/usr/bin/env node
import { preflight, renderMarkdown } from '../src/preflight.mjs'
import { preflightTarball, renderTarballMarkdown } from '../src/tarball.mjs'
const args = process.argv.slice(2)
const value = (name) => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1] }
if (args.includes('--help') || args.includes('-h')) {
  console.log('dsh-preflight <plugin-dir> [--json] | dsh-preflight --tarball FILE [--json]\n\nStatic package-surface/tarball preflight. Exit 1 on BLOCK.')
  process.exit(0)
}
const target = args.find((a) => !a.startsWith('--')) || '.'
try {
  const tarball = value('--tarball')
  const report = tarball ? preflightTarball(tarball) : await preflight(target)
  if (args.includes('--json')) console.log(JSON.stringify(report, null, 2))
  else console.log(tarball ? renderTarballMarkdown(report) : renderMarkdown(report))
  process.exitCode = report.verdict === 'BLOCK' ? 1 : 0
} catch (error) { console.error(`dsh-preflight: ${error.message}`); process.exitCode = 2 }
