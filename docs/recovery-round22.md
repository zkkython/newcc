# Recovery Round 22

Date: 2026-04-01

## Scope
Restore UDS peer listing baseline behavior and remove stale reconstruction messaging.

## Changes

- `src/utils/udsClient.ts`
  - Replaced placeholder `listAllLiveSessions()` implementation (always `[]`) with real session discovery:
    - reads `~/.claude/sessions/*.json`
    - validates PID files (`<pid>.json`)
    - filters to live processes via `isProcessRunning(pid)`
    - parses and returns session metadata (`kind/sessionId/pid/cwd/messagingSocketPath/name/bridgeSessionId`)
    - stable pid-sort output

- `src/commands/peers/index.ts`
  - Updated empty-state message from reconstruction-specific wording to neutral output:
    - `No live peers discovered.`

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- `bun src/entrypoints/cli.tsx --help`
  - executable help output normal.
