# Recovery Round 20

Date: 2026-04-01

## Scope
Tighten SDK runtime type fidelity and session mutation behavior consistency.

## Changes

- `src/entrypoints/sdk/runtimeTypes.ts`
  - Refined `Options` from `Record<string, unknown>` to explicit practical fields used by runtime prompt execution:
    - `cwd/model/fallbackModel/systemPrompt/appendSystemPrompt/maxTurns/maxBudgetUsd/taskBudget/replayUserMessages/includePartialMessages/verbose/jsonSchema`
    - `commands/tools/mcpClients/canUseTool` as lightweight `unknown[]` / function placeholders
    - retained index signature for forward compatibility
  - Extended `SessionMutationOptions` with `dir?: string`.
  - Extended `ForkSessionOptions` with:
    - `dir?: string`
    - `upToMessageId?: string`
    - `title?: string`
    - `timeoutMs?: number`
    - `signal?: AbortSignal`
    - legacy `options?: Options` retained for compatibility.

- `src/entrypoints/agentSdkTypes.ts`
  - Added `withAbortAndTimeout(...)` helper.
  - Updated `renameSession(...)` and `tagSession(...)`:
    - support `dir` lookup
    - enforce `timeoutMs/signal` cancellation behavior
  - Updated `forkSession(...)`:
    - support `dir`
    - support `upToMessageId` branching cutoff (with not-found error)
    - support top-level `title` plus legacy nested `options.title`
    - enforce `timeoutMs/signal`

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- `node reconstructed-client/claude-client.mjs --help`
  - executable help output normal.
