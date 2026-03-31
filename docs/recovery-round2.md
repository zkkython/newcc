# Recovery Round 2 (Semantic Hardening)

## Completed

1. Upgraded stub infrastructure:
- added resilient runtime proxy stubs (`callable + property-safe`) to avoid immediate crashes from undefined exports.
- new script: [`scripts/recovery/harden-existing-stubs.mjs`](/Users/kason/pythonwork/claude-code/scripts/recovery/harden-existing-stubs.mjs)

2. Replaced high-frequency placeholders with minimal semantic implementations:
- [`src/services/contextCollapse/index.ts`](/Users/kason/pythonwork/claude-code/src/services/contextCollapse/index.ts)
- [`src/services/contextCollapse/operations.ts`](/Users/kason/pythonwork/claude-code/src/services/contextCollapse/operations.ts)
- [`src/services/contextCollapse/persist.ts`](/Users/kason/pythonwork/claude-code/src/services/contextCollapse/persist.ts)
- [`src/services/compact/snipCompact.ts`](/Users/kason/pythonwork/claude-code/src/services/compact/snipCompact.ts)
- [`src/services/compact/snipProjection.ts`](/Users/kason/pythonwork/claude-code/src/services/compact/snipProjection.ts)
- [`src/services/compact/cachedMCConfig.ts`](/Users/kason/pythonwork/claude-code/src/services/compact/cachedMCConfig.ts)
- [`src/services/compact/cachedMicrocompact.ts`](/Users/kason/pythonwork/claude-code/src/services/compact/cachedMicrocompact.ts)
- [`src/services/compact/reactiveCompact.ts`](/Users/kason/pythonwork/claude-code/src/services/compact/reactiveCompact.ts)

3. Integrity re-scan:
- unresolved imports: `0`
- unresolved modules: `0`
- generated stubs still present: `143` (now hardened)

## Current status

- Module graph is closed.
- Core compact/collapse/snip call sites no longer depend on raw undefined stubs.
- Behavioral parity with original private code is still incomplete in remaining stubbed modules.

## Next suggested targets (Round 3)

1. `src/cli/bg.ts`, `src/daemon/*`, `src/environment-runner/*`, `src/self-hosted-runner/*`
2. `src/services/skillSearch/*`
3. `src/assistant/*` and `src/commands/assistant/*`
4. `src/server/*` and `src/ssh/*`

