# Recovery Round 58

Date: 2026-04-02

## Scope
Improve env-less bridge failure UX by surfacing stage-aware, actionable failure details through state transitions.

## Changes

- `src/bridge/remoteBridgeCore.ts`
  - Added `formatInitFailureDetail(...)` helper to summarize structured startup failures.
  - Updated init failure state transitions:
    - session creation failure now emits detail derived from classified failure
    - bridge credential fetch failure now emits detail derived from classified failure
  - Detail mapping includes:
    - auth-like HTTP failures (401/403) -> login guidance hint
    - generic HTTP status/detail
    - network error summary
    - schema mismatch summary

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- source checks confirm onStateChange failure details are now failure-aware and no longer fixed generic text only.
