# Recovery Round 24

Date: 2026-04-01

## Scope
Add a non-WebSocket direct-connect message path so `server` + `open -p` work over unix socket transport.

## Changes

- `src/server/sessionManager.ts`
  - Added in-memory per-session SDK message history.
  - Added `submitPrompt(sessionId, prompt)`:
    - validates session existence
    - emits reconstructed `assistant` + `result` SDK messages
    - persists messages into session history
  - Added `listSessionMessages(sessionId)`.

- `src/server/server.ts`
  - Added `POST /sessions/:id/messages`:
    - accepts prompt payload (`prompt` / `message.content` / `content`)
    - routes to `sessionManager.submitPrompt(...)`
    - returns `{ messages }`
  - Added `GET /sessions/:id/messages` for message history reads.

- `src/server/connectHeadless.ts`
  - Added unix transport fallback execution path:
    - when `serverUrl` is `unix:<socketPath>`, prompt submission now uses HTTP-over-UDS (`POST /sessions/:id/messages`)
    - supports `text/json/stream-json` output in this path
  - Retains existing WebSocket streaming path for non-unix server URLs.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- `node reconstructed-client/claude-client.mjs --help`
  - executable help output normal.
