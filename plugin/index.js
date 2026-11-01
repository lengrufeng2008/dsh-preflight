// DSH host plugin: static package-surface preflight for skill/plugin bundles.
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preflight, renderMarkdown } from '../src/preflight.mjs'
const PLUGIN_DIR = dirname(fileURLToPath(import.meta.url))
const SKILL_PATH = join(PLUGIN_DIR, '..', 'skills', 'plugin-preflight', 'SKILL.md')
const PROVIDER = 'dsh-preflight'
export const name = 'preflight'
export const inject = ['tools', 'skills']
function stripFrontmatter(text) { if (!text.startsWith('---\n')) return text; const end = text.indexOf('\n---\n', 4); return end === -1 ? text : text.slice(end + 5) }
const summary = {
  name: 'plugin-preflight', description: 'Static package-surface preflight for DSH skill/plugin bundles: manifest, bundle patch, skills frontmatter, unsupported artifacts, lifecycle scripts, size.',
  whenToUse: 'Before packaging or publishing a DSH plugin bundle.',
  invocation: { modelInvocable: true, userInvocable: true }, source: 'bundled', provider: PROVIDER,
  resourceBase: { kind: 'directory', path: join(PLUGIN_DIR, '..', 'skills', 'plugin-preflight') },
  rank: 600, locator: 'plugin-preflight', metadata: { domain: 'packaging', version: '0.1.0' },
}
export function apply(ctx) {
  ctx.tools.register({
    name: 'plugin_preflight', description: 'Static package-surface preflight for a DSH plugin directory. Checks package metadata, bundle patch, skill frontmatter, unsupported artifacts, lifecycle scripts, and size. Not an install test or security audit.',
    parameters: { type: 'object', additionalProperties: false, properties: { path: { type: 'string', description: 'Plugin package directory.' }, format: { type: 'string', enum: ['markdown', 'json'] } }, required: ['path'] },
    output: { schema: { type: 'object', additionalProperties: false, properties: { markdown: { type: 'string' }, verdict: { type: 'string' }, issues: { type: 'integer' }, warnings: { type: 'integer' } }, required: ['markdown', 'verdict', 'issues', 'warnings'] }, render: (_a, v) => [{ type: 'text', text: v.markdown }] },
    timeoutMs: 30_000,
    async execute(args = {}) {
      const report = await preflight(args.path)
      return { markdown: args.format === 'json' ? JSON.stringify(report, null, 2) : renderMarkdown(report), verdict: report.verdict, issues: report.issues.length, warnings: report.warnings.length }
    },
  })
  ctx.skills.registerProvider(() => ({ name: PROVIDER, async list() { return [summary] }, async get(candidate) { if (candidate?.name !== 'plugin-preflight') return undefined; return { ...summary, content: stripFrontmatter(await readFile(SKILL_PATH, 'utf8')) } } }))
}
