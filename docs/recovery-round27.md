# Recovery Round 27

Date: 2026-04-01

## Scope
Rebuild a minimal direct-connect WebSocket server path (`/sessions/:id/ws`) so interactive/streaming clients can receive real-time SDK messages.

## Changes

- `src/server/server.ts`
  - Added WebSocket upgrade handling with auth enforcement:
    - endpoint: `/sessions/:id/ws`
    - checks bearer token via existing `isAuthorized(...)`
    - rejects unknown paths (`404`) and unauthorized upgrades (`401`)
  - Added per-connection runtime:
    - validates target session exists
    - emits `system/init` SDK message on connect
    - accepts newline-delimited JSON user messages
    - routes user prompt payload to `sessionManager.submitPrompt(...)`
    - streams generated SDK messages back as NDJSON frames
  - Added structured execution-error responses for malformed input / processing failures.
  - Updated server shutdown to close WebSocket clients/server cleanly.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- `bun src/entrypoints/cli.tsx --help`
  - executable help output normal.
