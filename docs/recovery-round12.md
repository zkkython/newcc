# Recovery Round 12

Date: 2026-03-31

## Completed in this round

1. Restored MCP skill bridge surface:
- `src/skills/mcpSkills.ts`
- Added `fetchMcpSkillsForClient` with memoized cache semantics (`cache.delete(name)` compatible).

2. Restored session transcript bridge surface:
- `src/services/sessionTranscript/sessionTranscript.ts`
- Added `writeSessionTranscriptSegment` and `flushOnDateChange` runtime-safe no-op implementations.

3. Restored CLI transport contract:
- `src/cli/transports/Transport.ts`
- Replaced `any` stub with explicit `Transport` interface used by SSE/WS transports and `RemoteIO`.

4. Restored SDK generated/type entrypoints:
- `src/entrypoints/sdk/coreTypes.generated.ts`
- `src/entrypoints/sdk/settingsTypes.generated.ts`
- `src/entrypoints/sdk/toolTypes.ts`
- `coreTypes.generated.ts` now exports infer-based SDK core types from `coreSchemas.ts`.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - `unresolvedImportRefs: 0`
  - `unresolvedImportEdges: 0`
  - `unresolvedModuleCount: 0`
- `bun src/entrypoints/cli.tsx --help` succeeded.
- Recovery stub count (`rg "__recovery_stub" src | wc -l`): `60`

