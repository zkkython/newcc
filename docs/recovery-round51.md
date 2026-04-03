# Recovery Round 51

Date: 2026-04-02

## Scope
Improve env-less bridge startup resilience by adding OAuth-refresh-aware retries on early session/bootstrap API calls.

## Changes

- `src/bridge/remoteBridgeCore.ts`
  - In `initEnvLessBridgeCore(...)`, added best-effort OAuth refresh retry paths for:
    - `createCodeSession(...)`
    - `fetchRemoteCredentials(...)`
  - Behavior:
    - keeps existing exponential retry wrapper (`withRetry`)
    - on first null result, attempts `onAuth401(staleToken)` once per stage
    - retries the same API with refreshed token if a new token is available
  - Replaced stale-token use in early archive-on-failure branches with:
    - `getAccessToken() ?? initialAccessToken`
    so teardown/archive has a better chance to succeed after refresh.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- source checks confirm refresh-aware retry guards are present for both create-session and fetch-credentials startup stages.
