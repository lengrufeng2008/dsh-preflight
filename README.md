# Plugin Preflight for DSH

> A small static preflight for DSH plugin packages. It catches the mistakes that make a bundle fail
> review: missing bundle patch, lifecycle scripts, stray logs/binaries, broken skill frontmatter.

## Use

```bash
node bin/dsh-preflight.mjs /path/to/plugin
node bin/dsh-preflight.mjs /path/to/plugin --json
node bin/dsh-preflight.mjs --tarball /path/to/package.tgz
```

The tarball mode checks the actual `npm pack` output: required files, bundle patch, lifecycle
scripts, unsupported entries, and `test/`/`dist/` residue.

In DSH:

```text
Use plugin_preflight on /path/to/plugin.
```

## Scope

- Static package surface only
- No install, boot, runtime, signature, or security test
- A PASS is not a safety certificate

## Tests

```bash
npm test
```

## Provenance

Inspired by DSH-Store's static precheck; this is an independent small implementation. No store source
code is copied. License: MIT.
