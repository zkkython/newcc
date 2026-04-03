# Recovery Round 55

Date: 2026-04-02

## Scope
Harden code-session API payload/response validation for better protocol compatibility and error diagnostics.

## Changes

- `src/bridge/codeSessionApi.ts`
  - Tightened `bridgeOptions` guard in session-create payload:
    - accepts plain object only (rejects arrays/falsy -> `{}` fallback)
  - Expanded `/bridge` response parsing robustness:
    - accepts `expires_in` as number or numeric string
    - validates `expires_in > 0`
    - keeps `worker_epoch` parsing from string/number with safe-integer checks
  - Improved invalid-response debug logging to include both epoch and expires fields.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- source checks confirm stricter bridge payload guard and epoch/expires parsing path.
