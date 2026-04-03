# Recovery Round 61

Date: 2026-04-02

## Scope
Add executable guardrails for env-less bridge retry/failure-classification behavior to reduce regression risk.

## Changes

- Added executable validation script:
  - `scripts/recovery/check-bridge-retry-coverage.mjs`
- Script assertions (source-level invariants over `src/bridge/remoteBridgeCore.ts`):
  - `shouldRetryInitFailure(...)` exists
  - `withRetry(...)` supports `opts.shouldRetry`
  - init stage `createCodeSession` uses failure-classified `shouldRetry`
  - init stage `fetchRemoteCredentials` uses failure-classified `shouldRetry`
  - runtime proactive refresh uses failure-classified `shouldRetry`
  - runtime 401 recovery refresh uses failure-classified `shouldRetry`
  - refresh failure telemetry helper exists
  - refresh failure telemetry event (`tengu_bridge_repl_v2_refresh_stage_failed`) is emitted

## Validation

- `node scripts/recovery/check-bridge-retry-coverage.mjs`
  - result: passed
- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
