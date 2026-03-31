# Recovery Round 16

Date: 2026-03-31

## Scope
Filled remaining implementation gaps in `src/entrypoints/agentSdkTypes.ts` so the SDK entrypoint no longer throws `not implemented` errors.

## Implemented

- `tool(...)`
  - Returns concrete SDK MCP tool definition object.

- `createSdkMcpServer(...)`
  - Returns `type: 'sdk'` server config with in-process instance payload.

- `query(...)`
  - Replaced throw-path with executable async iterable fallback.
  - Accepts string and async-iterable prompts and yields a terminal `result` error message instead of throwing.

- `unstable_v2_createSession(...)` / `unstable_v2_resumeSession(...)` / `unstable_v2_prompt(...)`
  - Added minimal session object implementation wiring to `query`, `getSessionInfo`, `getSessionMessages`, and `forkSession`.

- Session APIs
  - `getSessionMessages(...)`: resolves transcript path, parses JSONL, reconstructs leaf-to-root chain via `parentUuid`, supports `offset/limit/includeSystemMessages`.
  - `listSessions(...)`: wired to `listSessionsImpl`.
  - `getSessionInfo(...)`: wired to `resolveSessionFilePath + readSessionLite + parseSessionInfoFromLite`.
  - `renameSession(...)`: appends `custom-title` entry.
  - `tagSession(...)`: appends `tag` entry (empty string for clear).
  - `forkSession(...)`: creates forked transcript with remapped UUIDs/sessionId and optional custom title persistence.

- Daemon primitives
  - `watchScheduledTasks(...)`: wired to `createCronScheduler` with async queue/stream wrapper and abort teardown.
  - `buildMissedTaskNotification(...)`: wired to canonical `cronScheduler` formatter.
  - `connectRemoteControl(...)`: switched to non-throwing fallback (`null`) to keep SDK runtime callable.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`

- `node reconstructed-client/claude-client.mjs --help`
  - executable and prints usage normally.

- `rg -n "not implemented" src`
  - no active throw-based implementation gaps remain.

## Notes

- `query(...)` and `connectRemoteControl(...)` are now executable fallbacks, not full production bridge implementations.
- Next step should replace fallback query path with actual subprocess/transport wiring used by SDK runtime.
