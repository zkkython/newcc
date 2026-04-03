# Recovery Round 60

Date: 2026-04-02

## Scope
Extend failure-classified telemetry/detail reporting from init stage into runtime credential refresh paths.

## Changes

- `src/bridge/remoteBridgeCore.ts`
  - Added `logBridgeRefreshFailure(...)` helper to emit structured telemetry for refresh failures.
  - Added telemetry event `tengu_bridge_repl_v2_refresh_stage_failed` with fields:
    - `cause` (`proactive_refresh` / `auth_401_recovery`)
    - `stage`
    - `kind`
    - `status`
  - Proactive refresh path:
    - when `fetchRemoteCredentials (proactive)` exhausts/early-stops and returns null, now logs structured refresh failure metadata before returning.
  - 401 recovery path:
    - when `fetchRemoteCredentials (recovery)` fails, now logs structured refresh failure metadata.
    - failure state detail now reuses classified formatter (`formatInitFailureDetail`) instead of only generic fixed text.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- source checks confirm runtime refresh failure paths now emit structured telemetry and detail-aware failure messages.
