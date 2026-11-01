#!/usr/bin/env node
import { preflight, renderMarkdown } from '../src/preflight.mjs'
const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log('dsh-preflight <plugin-dir> [--json]\n\nStatic package-surface preflight. Exit 1 on BLOCK.')
  process.exit(0)
}
const target = args.find((a) => !a.startsWith('--')) || '.'
try {
  const report = await preflight(target)
  if (args.includes('--json')) console.log(JSON.stringify(report, null, 2))
  else console.log(renderMarkdown(report))
  process.exitCode = report.verdict === 'BLOCK' ? 1 : 0
} catch (error) { console.error(`dsh-preflight: ${error.message}`); process.exitCode = 2 }
