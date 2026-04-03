# Recovery Round 19

Date: 2026-04-01

## Scope
Promote prompt-style SDK query path (`query({ prompt, options })`) from fallback behavior to real runtime execution.

## Changes

- `src/entrypoints/agentSdkTypes.ts`
  - Added runtime wiring to `QueryEngine.ask(...)` for prompt-style query calls.
  - Added prompt-session context cache keyed by session ID:
    - `mutableMessages`
    - `readFileCache`
    - `appStateStore`
  - Added default runtime bootstrap for prompt calls when caller does not inject all dependencies:
    - commands: `getCommands(cwd)`
    - tools: `getTools(toolPermissionContext)`
    - app state: `getDefaultAppState()` + `createStore(...)`
    - permissions: `hasPermissionsToUseTool`
    - cwd: `getCwd()`
  - Added async user-message stream handling for `prompt: AsyncIterable<SDKUserMessage>`.
  - Session APIs (`unstable_v2_createSession/resumeSession`) now route prompt/query through shared session contexts for continuity.

## Effect

- Internal full query payload path already routed to `src/query.ts` (Round 17) remains intact.
- Prompt-style SDK query now executes the real engine pipeline instead of synthetic fallback output.
- Multi-turn session objects retain conversation context across calls via per-session cached state.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- `bun src/entrypoints/cli.tsx --help`
  - executable help output normal.
