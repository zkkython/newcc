# Recovery Round 56

Date: 2026-04-02

## Scope
Add structured init-failure diagnostics and telemetry for env-less bridge startup stages.

## Changes

- `src/bridge/codeSessionApi.ts`
  - Added structured failure contracts:
    - `CodeSessionFailureStage` (`create_session`, `fetch_bridge_credentials`)
    - `CodeSessionFailureKind` (`http`, `network`, `schema`)
    - `CodeSessionFailure`
  - Extended API helpers with optional failure callback:
    - `createCodeSession(..., onFailure?)`
    - `fetchRemoteCredentials(..., onFailure?)`
  - Failure callback now receives stage/kind/status/detail at key error sites.

- `src/bridge/remoteBridgeCore.ts`
  - Captures structured failures for both startup stages (session create + bridge credential fetch).
  - Emits telemetry when stage retries are exhausted:
    - event: `tengu_bridge_repl_v2_init_stage_failed`
    - fields: `stage`, `kind`, `status`, `refresh_attempted`
  - Adds debug logs with structured failure details for postmortem correlation.
  - Threads optional failure callback through `fetchRemoteCredentials(...)` wrapper.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- source checks confirm structured failure contracts and stage-failure telemetry wiring.
