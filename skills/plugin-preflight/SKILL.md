---
name: plugin-preflight
description: Run a static package-surface preflight on a DSH plugin before publishing. Use plugin_preflight to check metadata, bundle patch, skill frontmatter, unsupported artifacts, lifecycle scripts, and size.
whenToUse: "Before packaging, releasing, or submitting a DSH plugin bundle."
---

# Plugin preflight

```text
Use plugin_preflight on /path/to/plugin.
```

It checks:

- `package.json` name, version, license
- `dsh.bundle.patch` exists
- `skills/*/SKILL.md` has `name` and `description`
- no `.log`, archives, native binaries, or unsupported artifacts
- no `preinstall`/`install`/`postinstall`/`prepare`
- total surface under 8 MiB and README present

A `PASS` is a packaging check, not an install test and not a security audit.
