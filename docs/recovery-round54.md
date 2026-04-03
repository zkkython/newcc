# Recovery Round 54

Date: 2026-04-02

## Scope
Add forward-compatible bridge session creation parameter passthrough so env-less bridge startup is not hardcoded to an empty bridge payload.

## Changes

- `src/bridge/codeSessionApi.ts`
  - Added `CodeSessionBridgeOptions` type.
  - Extended `createCodeSession(...)` signature with optional `bridgeOptions`.
  - Session create payload now sends `bridge: bridgeOptions ?? {}` (with object guard), preserving existing default behavior while allowing future protocol fields.

- `src/bridge/remoteBridgeCore.ts`
  - Extended `EnvLessBridgeParams` with optional `bridgeOptions`.
  - Threaded `bridgeOptions` through env-less startup call path into both primary and refreshed `createCodeSession(...)` attempts.
  - Re-exported `CodeSessionBridgeOptions` from this module for bridge callers.

- `src/bridge/initReplBridge.ts`
  - Extended `InitBridgeOptions` with `bridgeOptions`.
  - Forwarded `bridgeOptions` into `initEnvLessBridgeCore(...)`.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- source checks confirm bridge options passthrough from REPL init → remote bridge core → code-session API payload.
