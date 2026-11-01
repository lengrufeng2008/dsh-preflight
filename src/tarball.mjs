import { execFileSync } from 'node:child_process'
import { basename } from 'node:path'
const BAD = /\.(?:log|tgz|zip|tar|gz|rar|7z|exe|dll|so|dylib|node|wasm|pdf)$/i
export function preflightTarball(tarball) {
  let entries
  try { entries = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' }).trim().split('\n').filter(Boolean) }
  catch (error) { throw new Error(`cannot read tarball: ${error.message}`) }
  const issues = []
  const warnings = []
  const has = (name) => entries.includes(`package/${name}`)
  if (!has('package.json')) issues.push('package/package.json is missing')
  if (!has('README.md')) warnings.push('package/README.md is missing')
  if (!has('LICENSE')) warnings.push('package/LICENSE is missing')
  const forbidden = entries.filter((e) => BAD.test(e) || /package\/test\//.test(e) || /package\/dist\//.test(e))
  for (const entry of forbidden) issues.push(`unsupported entry: ${entry}`)
  let pkg = {}
  try { pkg = JSON.parse(execFileSync('tar', ['-xOzf', tarball, 'package/package.json'], { encoding: 'utf8' })) }
  catch { issues.push('package.json is not valid JSON') }
  for (const field of ['name', 'version', 'license']) if (!pkg[field]) issues.push(`package.json is missing ${field}`)
  for (const script of ['preinstall', 'install', 'postinstall', 'prepare']) if (pkg.scripts?.[script]) issues.push(`lifecycle script present: ${script}`)
  if (!pkg.dsh?.bundle?.patch) issues.push('dsh.bundle.patch is missing')
  else if (!has(pkg.dsh.bundle.patch.replace(/^\.\//, ''))) issues.push(`bundle patch is missing: ${pkg.dsh.bundle.patch}`)
  return { tarball: basename(tarball), entries: entries.length, package: { name: pkg.name, version: pkg.version }, issues, warnings, verdict: issues.length ? 'BLOCK' : warnings.length ? 'WARN' : 'PASS' }
}
export function renderTarballMarkdown(report) {
  const lines = [`# Tarball preflight: ${report.verdict}`, '', `- file: ${report.tarball}`, `- entries: ${report.entries}`, '']
  for (const i of report.issues) lines.push(`- BLOCK ${i}`)
  for (const w of report.warnings) lines.push(`- WARN ${w}`)
  if (!report.issues.length && !report.warnings.length) lines.push('No issues under these checks.')
  lines.push('', 'Static tarball checks only; not an install test or security audit.')
  return lines.join('\n')
}
