# Recovery Round 48

Date: 2026-04-02

## Scope
Replace built-in plugin initialization scaffolding with a concrete, testable built-in plugin registration path.

## Changes

- `src/plugins/bundled/index.ts`
  - Added real built-in plugin registration in `initBuiltinPlugins()`.
  - Registered plugin: `builtin-ops@builtin`
    - description: operational diagnostics helper
    - `defaultEnabled: false` (opt-in; no behavior change for users until enabled)
    - availability gated to internal/debug environments (`ANT_DEBUG` or `USER_TYPE=ant`)
  - Added one user-invocable built-in skill definition under the plugin:
    - `builtin-ops-help`
    - provides a concise diagnostics checklist (sessions/daemon/runners/recovery docs)

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- source checks confirm `initBuiltinPlugins()` now performs concrete registration.
