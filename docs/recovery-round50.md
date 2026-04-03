# Recovery Round 50

Date: 2026-04-02

## Scope
Harden remote runner protocol behavior with timeout/retry handling and epoch-conflict recovery.

## Changes

- `src/environment-runner/main.ts`
  - Added CCR request timeout control (10s) using `AbortController`.
  - Added retry wrapper (`requestCcrJsonWithRetry`) for transient failures.
  - Added worker-epoch conflict recovery:
    - on HTTP 409 for worker init/heartbeat, runner now attempts re-registration via `registerWorker(...)`
    - retries init/heartbeat with the refreshed epoch
    - updates in-memory/env epoch (`CLAUDE_CODE_WORKER_EPOCH`) on success
  - Improved remote error reporting:
    - explicit messages for post-refresh heartbeat failure and re-register failure.

- `src/self-hosted-runner/main.ts`
  - Added poll request timeout control (10s) with `AbortController`.
  - Added bounded retry behavior (2 attempts) for transient poll failures:
    - retries on network errors
    - retries on HTTP 5xx / 429
    - non-retry on other 4xx responses.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- source checks confirm timeout, retry, and epoch refresh code paths are present.
