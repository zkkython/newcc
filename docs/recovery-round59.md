# Recovery Round 59

Date: 2026-04-02

## Scope
Harden env-less bridge init retries with failure-aware retry budget control to avoid retrying non-retryable startup failures.

## Changes

- `src/bridge/remoteBridgeCore.ts`
  - Added `shouldRetryInitFailure(...)` to classify startup failures for retry policy.
  - Extended `withRetry(...)` to accept `opts.shouldRetry`:
    - supports early-stop when failure is non-retryable
    - logs explicit early-stop reason for diagnostics
    - preserves existing backoff+jitter behavior for retryable cases
  - Wired failure-aware retry policy into both init stages:
    - `createCodeSession` stage now retries only for retryable failure kinds/statuses
    - `fetchRemoteCredentials` stage now retries only for retryable failure kinds/statuses
  - Extended the same retry classifier to runtime credential refresh paths:
    - proactive refresh (`fetchRemoteCredentials (proactive)`)
    - 401 recovery refresh (`fetchRemoteCredentials (recovery)`)
  - Retryability policy currently treats `schema` failures as non-retryable; network/5xx/selected 4xx (`401/403/408/409/425/429`) as retryable.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- Source validation
  - `shouldRetryInitFailure` defined and referenced at init and runtime refresh `withRetry` call sites.
  - `withRetry` now supports and enforces optional `shouldRetry` early-stop path.
