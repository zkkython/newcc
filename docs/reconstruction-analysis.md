# Claude Code Snapshot Reconstruction Analysis

## Scope

Repository snapshot currently contains only:

- `README.md`
- `src/` (~1902 files)

Missing build/runtime scaffolding:

- `package.json`
- lockfile (`pnpm-lock.yaml` / `yarn.lock` / `package-lock.json`)
- `tsconfig*.json`
- Bun/Node build config
- test config and scripts

## Static import gap scan

A full local scan over all `src/**/*.{ts,tsx,js,jsx}` import targets found:

- **581 unresolved local imports**
- **214 unique missing module targets**

Top missing targets:

1. `../../types/message.js` (81 refs)
2. `../types/message.js` (71 refs)
3. `./types.js` (53 refs)
4. `src/types/message.js` (20 refs)
5. `../../types/tools.js` (15 refs)

Top affected files:

1. `src/main.tsx` (30 missing imports)
2. `src/skills/bundled/claudeApiContent.ts` (26)
3. `src/services/compact/microCompact.ts` (11)
4. `src/query.ts` (9)
5. `src/components/permissions/PermissionRequest.tsx` (7)

Top affected areas:

- `components/` (114)
- `utils/` (110)
- `services/` (65)
- `tools/` (52)
- `commands/` (31)

## Why original snapshot cannot directly execute

1. **Entrypoint chain is broken**: `src/entrypoints/cli.tsx` and `src/main.tsx` both import many absent modules.
2. **Core message/type graph missing**: `types/message.js` and related contracts are absent but referenced across most subsystems.
3. **No dependency manifest**: external runtime packages cannot be resolved reproducibly.
4. **Feature-gated code expects private/internal modules**: several imports are behind Bun feature flags but still present in source import graph.

## Reconstruction strategy adopted

Instead of generating hundreds of brittle stubs, this repo now includes a **clean, executable reconstruction client** under `reconstructed-client/`:

- CLI + interactive REPL
- Claude Messages API integration
- Tool-calling loop (with user permission prompts)
- Core filesystem/shell/search tools
- Session history save/load and command controls

This provides a practical, auditable, runnable "Claude-style" client while preserving this snapshot as a research artifact.

## Run

```bash
cd reconstructed-client
node claude-client.mjs --help
ANTHROPIC_API_KEY=... node claude-client.mjs
```
