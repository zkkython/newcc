# Recovery Round 52

Date: 2026-04-02

## Scope
Improve env-less bridge retry resilience for init-time API stages.

## Changes

- `src/bridge/remoteBridgeCore.ts`
  - Hardened `withRetry(...)` utility:
    - catches thrown exceptions from retry body (instead of failing fast)
    - logs per-attempt thrown error details
    - clamps computed backoff delay to non-negative range
    - logs final exhausted-retries error context
  - This improves robustness for transient exceptions from axios/fetch wrappers during:
    - session creation
    - credential fetch
    - proactive/recovery refresh paths that reuse `withRetry(...)`

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- source checks confirm throw-safe retry and backoff clamping are active.
