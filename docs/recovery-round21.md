# Recovery Round 21

Date: 2026-04-01

## Scope
Align session-read APIs with mutation APIs for cancellation/timeout semantics, and refine remaining-gap inventory.

## Changes

- `src/entrypoints/sdk/runtimeTypes.ts`
  - Added `timeoutMs?: number` and `signal?: AbortSignal` to:
    - `ListSessionsOptions`
    - `GetSessionInfoOptions`
    - `GetSessionMessagesOptions`

- `src/entrypoints/agentSdkTypes.ts`
  - Updated `getSessionMessages(...)` to run under shared `withAbortAndTimeout(...)` wrapper.
  - Updated `listSessions(...)` to run under shared `withAbortAndTimeout(...)` wrapper.
  - Updated `getSessionInfo(...)` to run under shared `withAbortAndTimeout(...)` wrapper.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- `node reconstructed-client/claude-client.mjs --help`
  - executable help output normal.
