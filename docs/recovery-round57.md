# Recovery Round 57

Date: 2026-04-02

## Scope
Make env-less bridge OAuth refresh behavior failure-aware instead of unconditional per stage.

## Changes

- `src/bridge/remoteBridgeCore.ts`
  - Added `shouldAttemptAuthRefresh(...)` decision helper:
    - refresh on `network` failures
    - refresh on `http` failures with status `401` or `403`
    - no refresh on schema failures or unrelated 4xx/5xx cases
  - Updated startup stage retry loops (`createCodeSession`, `fetchRemoteCredentials`):
    - clear per-attempt failure snapshot before each call
    - gate `onAuth401(...)` refresh attempt using failure-aware policy
  - This avoids unnecessary refresh churn on non-auth failures while preserving recovery for likely auth paths.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- source checks confirm failure-aware refresh gating is active in both env-less init stages.
