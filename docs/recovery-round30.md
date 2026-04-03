# Recovery Round 30

Date: 2026-04-01

## Scope
Improve operational compatibility around auth, background session commands, and daemon status control.

## Changes

- `src/server/server.ts`
  - Expanded auth acceptance in `isAuthorized(...)`:
    - supports `Authorization: Bearer <token>` (existing)
    - also supports URL query token (`?token=` / `?authToken=`) for cc-link compatibility

- `src/cli/bg.ts`
  - Replaced static placeholder behavior with usable baseline:
    - `ps` now lists live sessions from `listAllLiveSessions()`
    - `kill <sessionId>` now resolves by pid/sessionId/bridgeSessionId and sends `SIGTERM`
  - retained explicit placeholders for `logs`/`attach` paths not yet reconstructed

- `src/daemon/main.ts`
  - `status` now reads real lockfile/process state via `probeRunningServer()`
  - `stop` now attempts `SIGTERM` to running server pid and cleans lockfile
  - removed fixed “always inactive” daemon messaging

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- `bun src/entrypoints/cli.tsx --help`
  - executable help output normal.
