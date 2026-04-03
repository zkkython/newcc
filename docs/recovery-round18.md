# Recovery Round 18

Date: 2026-04-01

## Scope
Continue closing SDK runtime gaps in `agentSdkTypes.ts`, with focus on real query path wiring and remote-control bridge connectivity.

## Changes

- `query(...)` upgraded to hybrid dispatch:
  - Internal full payload (`messages/systemPrompt/toolUseContext/...`) now delegates to real `src/query.ts` implementation.
  - Prompt-style SDK payload (`{ prompt, options }`) keeps non-throwing fallback path.

- `connectRemoteControl(...)` upgraded from `null` fallback to bridge-backed implementation:
  - Reused `initBridgeCore` from `src/bridge/replBridge.ts`.
  - Reused session lifecycle APIs from `src/bridge/createSession.ts`.
  - Implemented adapter to `RemoteControlHandle` contract:
    - `write/sendResult/sendControlRequest/sendControlResponse/sendControlCancelRequest`
    - async streams: `inboundPrompts()`, `controlRequests()`, `permissionResponses()`
    - state listener fanout via `onStateChange(...)`
    - teardown forwarding and stream closure.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- `node reconstructed-client/claude-client.mjs --help`
  - executable help output normal.

## Notes

- Prompt-style `query({ prompt })` remains fallback-only by design in this reconstruction stage.
- Internal runtime callers using full query payload now execute the real query engine.
