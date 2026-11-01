import { readFile, readdir, stat } from 'node:fs/promises'
import { basename, extname, join, relative, resolve, sep } from 'node:path'

const BAD_EXT = /\.(?:log|tgz|zip|tar|gz|rar|7z|exe|dll|so|dylib|node|wasm|pdf)$/i
const TEXT = /\.(?:[cm]?[jt]sx?|json|ya?ml|md|txt|rst|html?|css|svg|png|jpe?g|webp|gif|ico|sh|bash|py|toml)$/i
const LIFECYCLE = ['preinstall', 'install', 'postinstall', 'prepare']
const SKIP = new Set(['.git', 'node_modules', 'dist', '.cache', 'test', 'launch', 'market'])

async function walk(root, dir = root, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue
    const p = join(dir, entry.name)
    if (entry.isDirectory()) await walk(root, p, out)
    else out.push(relative(root, p).split(sep).join('/'))
  }
  return out
}
async function exists(path) { return Boolean(await stat(path).catch(() => null)) }

export async function preflight(input) {
  const root = await resolve(input)
  const issues = []
  const warnings = []
  const pkgPath = join(root, 'package.json')
  if (!(await exists(pkgPath))) return { root, issues: ['package.json is missing'], warnings, verdict: 'BLOCK', files: 0, skills: 0 }
  let pkg
  try { pkg = JSON.parse(await readFile(pkgPath, 'utf8')) } catch { return { root, issues: ['package.json is not valid JSON'], warnings, verdict: 'BLOCK', files: 0, skills: 0 } }
  for (const field of ['name', 'version', 'license']) if (!pkg[field]) issues.push(`package.json is missing ${field}`)
  if (pkg.private === true) warnings.push('package.json is private; a public install needs a publishable package')
  for (const script of LIFECYCLE) if (pkg.scripts?.[script]) issues.push(`lifecycle script present: ${script}`)
  const patch = pkg.dsh?.bundle?.patch
  if (!patch) issues.push('package.json has no dsh.bundle.patch')
  else if (!(await exists(join(root, patch)))) issues.push(`bundle patch is missing: ${patch}`)
  if (!pkg.files?.length) warnings.push('package.json has no files allowlist; the package surface is broad')
  const allFiles = await walk(root)
  const selected = (file) => {
    if (file === 'package.json' || /^(?:LICEN[CS]E|README|NOTICE|COPYING)/i.test(basename(file))) return true
    if (!pkg.files?.length) return true
    return pkg.files.some((entry) => {
      if (entry.includes('*')) {
        const [before, after] = entry.split('*')
        return file.startsWith(before) && file.endsWith(after)
      }
      return file === entry || file.startsWith(entry.replace(/\/$/, '') + '/')
    })
  }
  const files = allFiles.filter(selected)
  for (const file of files) {
    if (file === 'package.json') continue
    if (BAD_EXT.test(file)) issues.push(`unsupported artifact: ${file}`)
    else if (!TEXT.test(file) && !/^(?:LICEN[CS]E|README|NOTICE|COPYING)/i.test(basename(file)) && !basename(file).startsWith('.')) warnings.push(`unrecognized file type: ${file}`)
  }
  const skills = []
  const skillsRoot = join(root, 'skills')
  if (await exists(skillsRoot)) {
    for (const entry of await readdir(skillsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const file = join(skillsRoot, entry.name, 'SKILL.md')
      if (!(await exists(file))) { warnings.push(`skills/${entry.name} has no SKILL.md`); continue }
      const text = await readFile(file, 'utf8')
      const fm = text.startsWith('---\n') ? text.slice(4, text.indexOf('\n---\n', 4)) : ''
      if (!/^name:\s*\S+/m.test(fm)) issues.push(`skills/${entry.name}/SKILL.md has no name`)
      if (!/^description:\s*\S+/m.test(fm)) issues.push(`skills/${entry.name}/SKILL.md has no description`)
      skills.push(entry.name)
    }
  }
  if (!(await exists(join(root, 'README.md')))) warnings.push('README.md is missing')
  const total = (await Promise.all(files.map(async (f) => (await stat(join(root, f))).size))).reduce((a, b) => a + b, 0)
  if (total > 8 * 1024 * 1024) issues.push(`package surface is ${total} bytes; over 8 MiB`)
  return { root, package: { name: pkg.name, version: pkg.version, license: pkg.license }, files: files.length, skills: skills.length, totalBytes: total, issues, warnings, verdict: issues.length ? 'BLOCK' : warnings.length ? 'WARN' : 'PASS' }
}

export function renderMarkdown(report) {
  const lines = [`# Plugin preflight: ${report.verdict}`, '', `- files: ${report.files}`, `- skills: ${report.skills}`, `- bytes: ${report.totalBytes}`, '']
  if (!report.issues.length && !report.warnings.length) lines.push('No issues under these checks. This is not a security audit or an install test.')
  if (report.issues.length) { lines.push('## Blocking', ''); for (const i of report.issues) lines.push(`- ${i}`) }
  if (report.warnings.length) { lines.push('## Warnings', ''); for (const w of report.warnings) lines.push(`- ${w}`) }
  lines.push('', 'Static package-surface checks only. A PASS does not prove runtime safety.')
  return lines.join('\n')
}
