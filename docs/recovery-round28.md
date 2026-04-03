# Recovery Round 28

Date: 2026-04-01

## Scope
Replace server-side synthetic prompt handling with real SDK query execution.

## Changes

- `src/server/sessionManager.ts`
  - Upgraded session runtime from synthetic response generation to SDK-backed execution.
  - Added per-session SDK runtime state:
    - `sdkSessions` map keyed by session ID (`unstable_v2_resumeSession(...)`)
    - `sessionMessages` history map for replay/introspection
  - `createSession(...)` now initializes SDK session context with session `cwd`.
  - `submitPrompt(sessionId, prompt)` is now async and executes:
    - `sdkSession.query({ prompt })`
    - collects streamed SDK messages
    - persists messages into session history
    - emits a structured execution error result when no messages are produced

- `src/server/server.ts`
  - Updated prompt-submission call sites to await async execution:
    - `POST /sessions/:id/messages`
    - `/sessions/:id/ws` message handling path

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- `node reconstructed-client/claude-client.mjs --help`
  - executable help output normal.
