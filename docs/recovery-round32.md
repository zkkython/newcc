# Recovery Round 32

Date: 2026-04-01

## Scope
Turn `claude daemon start` from a static placeholder into a real background server launcher.

## Changes

- `src/daemon/main.ts`
  - Added real daemon start behavior:
    - checks existing running server via `probeRunningServer()`
    - spawns detached child process to run `claude server`
    - injects `CLAUDE_CODE_SESSION_KIND=daemon`
    - polls lockfile for startup confirmation
  - Kept and integrated existing stop/status behavior:
    - stop sends `SIGTERM` and removes lockfile
    - status reports active/inactive with pid + URL

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- `node reconstructed-client/claude-client.mjs --help`
  - executable help output normal.
