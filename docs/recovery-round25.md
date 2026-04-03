# Recovery Round 25

Date: 2026-04-01

## Scope
Upgrade direct-connect fallback behavior from local synthetic responses to server-backed message execution.

## Changes

- `src/server/directConnectManager.ts`
  - Added HTTP message submission fallback:
    - `postMessagesHttp(content)` posts to `/sessions/:id/messages`
    - supports both normal HTTP server URLs and unix socket URLs (`unix:<path>`)
  - Replaced legacy fallback behavior:
    - before: generated synthetic local `assistant` + `result` messages
    - now: forwards real messages returned by server endpoint to callbacks
  - Added fallback error mapping:
    - HTTP fallback failures now emit a structured `result` error message to avoid hanging UI/headless flows.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- `node reconstructed-client/claude-client.mjs --help`
  - executable help output normal.
