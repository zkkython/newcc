# Recovery Round 46

Date: 2026-04-02

## Scope
Harden MCP transport lifecycle behavior by replacing empty `start()` implementations with explicit state transitions and error signaling.

## Changes

- `src/services/mcp/SdkControlTransport.ts`
  - `SdkControlClientTransport`:
    - added `isStarted` state
    - `start()` now validates closed state and marks started
    - `send()` now rejects calls before `start()`
    - wrapped `sendMcpMessage(...)` with error forwarding via `onerror`
  - `SdkControlServerTransport`:
    - added `isStarted` state
    - `start()` now validates closed state and marks started
    - `send()` now rejects calls before `start()`
    - wrapped callback dispatch with `onerror` forwarding

- `src/services/mcp/InProcessTransport.ts`
  - added explicit `started` lifecycle flag
  - `start()` now validates closed state and marks started
  - `send()` now enforces:
    - transport started
    - peer existence
    - peer started and not closed
  - async message delivery now catches peer handler exceptions and emits via `onerror`

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- source checks confirm transport lifecycle guards and non-silent error paths are present.
