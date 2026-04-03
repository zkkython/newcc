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

## Progress Update (2026-04-02)

Subsequent recovery rounds have significantly reduced command-surface gaps in
the `src/` runtime beyond the initial `reconstructed-client/` fallback:

- Import graph is now closed (`scan-missing-imports`: unresolved refs/edges/modules = 0).
- Previously unavailable/placeholder command entries were replaced with runnable
  implementations (including bg/daemon lifecycle, fork, workflows, buddy, share/teleport baselines).
- `environment-runner` and `self-hosted-runner` now include optional remote
  worker modes (register/heartbeat/poll baselines) while preserving local mode.
- Session/task/attribution auxiliary paths that were no-op now persist local
  operational data (`~/.claude/...`).

Remaining work is primarily protocol-parity hardening (exact behavior matching
for private server flows, retry/backoff semantics, and deep edge-case fidelity),
not import-closure/bootstrap viability.

## Remaining Work (as of 2026-04-02, Round 61)

Current status:
- Import graph closure remains green (`unresolved refs/edges/modules = 0`).
- Env-less bridge init/runtime retry paths now use failure-classified retry
  policy and emit structured failure telemetry.
- Added executable guard script:
  - `scripts/recovery/check-bridge-retry-coverage.mjs`

Estimated remaining implementation slices to reach "fully executable + parity-focused reconstruction":

1. Bridge state-machine parity (high)
- Build replay harnesses for close/error sequences (`401`, `4090`, `4091`,
  prolonged reconnect exhaustion) and assert expected `onStateChange` timeline.
- Verify transport rebuild ordering invariants (flush gate, sequence carry-over,
  write draining, teardown races) under forced failure injection.

2. Command semantic parity (high)
- For recovered commands, align edge-case behavior with source expectations:
  argument validation, error codes/messages, and output shape consistency.
- Add scripted smoke runs for command groups (`bg/daemon/fork/workflows/share/teleport/buddy`).

3. Persistence and ops-path parity (medium)
- Add deterministic checks for local transcript/session-data writes and
  attribution hook behavior in normal git repos + worktree/gitdir variants.
- Validate runner remote-mode state transitions (`register/heartbeat/poll`)
  across timeout/retry/epoch-conflict scenarios.

4. Executable verification baseline (high)
- Consolidate recovery checks into one repeatable script chain
  (`scan-missing-imports` + bridge coverage + command smokes).
- Produce a minimal “done criteria” matrix mapping each reconstructed subsystem
  to at least one executable assertion.

Current executable entrypoint for recovery checks:
- `node scripts/recovery/run-bridge-recovery-checks.mjs`
  - currently includes:
    - import-closure scan
    - bridge retry coverage
    - bridge state-machine coverage
    - bridge sequence coverage
    - command surface coverage
    - runner remote coverage
    - persistence/attribution coverage

Execution-smoke blocker (TS command modules):
- This snapshot lacks a project-local TS runtime toolchain (`tsx`/`ts-node`) and
  has no dependency manifest in-repo. Node's `--experimental-strip-types` is
  insufficient for this codebase's TS syntax surface (e.g. parameter
  properties), so direct runtime smoke for many `src/commands/**/*.ts` modules
  remains gated on adding a TS-capable runner to the reconstruction harness.

Latest runtime smoke status (2026-04-02):
- `tsx` is now available in the local environment, enabling direct runtime
  smoke execution for a TS command subset (`fork`, `workflows`).
- `buddy` currently remains Node-runtime blocked because its transitive config
  path imports `bun:bundle`; in Node+tsx this is unresolved without Bun runtime
  or a dedicated shim layer.
