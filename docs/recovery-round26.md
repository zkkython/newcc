# Recovery Round 26

Date: 2026-04-01

## Scope
Restore bridge peer message routing from hard fail to a usable UDS-backed path.

## Changes

- `src/bridge/peerSessions.ts`
  - Replaced fail-fast placeholder implementation with real routing:
    - discovers live peers via `listAllLiveSessions()`
    - resolves target by `bridgeSessionId` (or fallback `sessionId`)
    - sends payload via `sendToUdsSocket(messagingSocketPath, message)`
  - Added concrete error paths:
    - target peer not found
    - peer missing messaging socket path
    - socket send failure with propagated error text

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- `bun src/entrypoints/cli.tsx --help`
  - executable help output normal.
