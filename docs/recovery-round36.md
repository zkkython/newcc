# Recovery Round 36

Date: 2026-04-01

## Scope
Continue closing command-surface gaps by restoring three previously explicit "not restored" entries and removing anonymous command stubs from the internal command registry.

## Changes

- `src/commands/fork/index.ts`
  - Replaced placeholder text with executable fork directive output.
  - `/fork <directive>` now emits structured guidance for model-side fork execution and includes `FORK_DIRECTIVE_PREFIX` directive payload.
  - Empty args now return explicit usage help.

- `src/environment-runner/main.ts`
  - Replaced scaffolding-only behavior with runnable lifecycle commands:
    - `start [--once] [--interval-ms <n>]`
    - `status`
    - `stop`
    - `help`
  - Added heartbeat state persistence and PID liveness checks.

- `src/self-hosted-runner/main.ts`
  - Same runnable lifecycle behavior as `environment-runner`:
    - start/status/stop/help
  - Added heartbeat + PID/liveness management.

- `src/utils/runnerState.ts`
  - New shared runner state utility for:
    - reading/writing runner state (`~/.claude/runners/<kind>/state.json`)
    - PID liveness checks
    - stale state cleanup

- Internal command stub cleanup (`src/commands/*/index.js`)
  - Added `src/commands/reconstructedUnavailable.js`.
  - Replaced anonymous `{ name: 'stub' }` command exports with named reconstructed command objects for:
    - `debug-tool-call`, `share`, `summary`, `onboarding`, `bughunter`,
      `oauth-refresh`, `good-claude`, `mock-limits`, `ant-trace`,
      `reset-limits`, `env`, `ctx_viz`, `backfill-sessions`, `issue`,
      `autofix-pr`, `perf-issue`, `break-cache`, `teleport`.
  - Each now has stable command metadata and executable local `call` response path.

## Validation

- `rg "name: 'stub'" src/commands` -> no matches.
- `rg "not fully restored yet|currently unavailable in reconstructed mode|Reconstructed build provides CLI scaffolding only" src` -> no matches.
- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`

