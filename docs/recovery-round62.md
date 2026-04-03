# Recovery Round 62

Date: 2026-04-02

## Scope
Establish an executable bridge state-machine verification baseline and unify bridge recovery checks behind a single command.

## Changes

- Added new state-machine invariant checker:
  - `scripts/recovery/check-bridge-state-machine-coverage.mjs`
  - Validates key behavioral invariants in `src/bridge/remoteBridgeCore.ts`:
    - `onClose` has a dedicated 401 recovery branch
    - non-401 close path transitions to failed state
    - rebuild path starts `flushGate` before transport swap
    - rebuild path re-schedules token refresh
    - rebuild path drains queued writes and drops gate in `finally`
    - 401 recovery emits reconnecting state before refresh attempt
    - 401 recovery resets `initialFlushDone` before rebuild
    - connect-timeout telemetry hook exists

- Added unified executable check chain:
  - `scripts/recovery/run-bridge-recovery-checks.mjs`
  - Runs, in order:
    1. `scan-missing-imports.mjs`
    2. `check-bridge-retry-coverage.mjs`
    3. `check-bridge-state-machine-coverage.mjs`

- Updated reconstruction analysis doc with a concrete bridge verification entrypoint.

## Validation

- `node scripts/recovery/run-bridge-recovery-checks.mjs`
  - all steps passed
- standalone checks also passed:
  - `node scripts/recovery/check-bridge-retry-coverage.mjs`
  - `node scripts/recovery/check-bridge-state-machine-coverage.mjs`
- import graph remains closed:
  - unresolved refs/edges/modules: `0`
