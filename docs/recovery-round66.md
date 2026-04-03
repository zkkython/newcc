# Recovery Round 66

Date: 2026-04-02

## Scope
Add sequence-level bridge failure/recovery timeline checks and fold them into the unified reconstruction recovery pipeline.

## Changes

- Added bridge sequence coverage checker:
  - `scripts/recovery/check-bridge-sequence-coverage.mjs`
  - Uses ordered source-sequence assertions over `src/bridge/remoteBridgeCore.ts` to validate timeline semantics:
    - 401 close path transitions into recovery flow
    - non-401 close path transitions to failed state
    - proactive refresh failure path is failure-classified/logged
    - 401 recovery failure path emits classified detail
    - rebuild ordering preserves flush/reconnect/drain/drop invariants

- Updated unified recovery runner:
  - `scripts/recovery/run-bridge-recovery-checks.mjs`
  - Added step: `bridge sequence coverage`

- Updated reconstruction analysis to reflect the new check category in the unified coverage list.

## Validation

- `node scripts/recovery/check-bridge-sequence-coverage.mjs`
  - passed
- `node scripts/recovery/run-bridge-recovery-checks.mjs`
  - all steps passed
- embedded import scan remains green:
  - unresolved refs/edges/modules: `0`
