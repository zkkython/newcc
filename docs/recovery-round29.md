# Recovery Round 29

Date: 2026-04-01

## Scope
Harden the rebuilt `/sessions/:id/ws` protocol handling for streaming clients.

## Changes

- `src/server/server.ts`
  - Added connection keepalive frames:
    - emits `{"type":"keep_alive"}` every 25s while WS is open
    - clears timer on socket close
  - Added serialized prompt execution queue per WS connection:
    - user prompts are enqueued and executed in-order (`processingChain`)
    - avoids overlapping `submitPrompt(...)` runs for a single session socket
  - Added control request handling:
    - `control_request` with `subtype: "interrupt"` now returns `control_response` success ack
    - unsupported control subtypes return `control_response` error
  - Added inbound keep_alive ignore path for client-emitted keepalive messages.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- `bun src/entrypoints/cli.tsx --help`
  - executable help output normal.
