# Recovery Round 31

Date: 2026-04-01

## Scope
Upgrade `claude bg` command surfaces from static placeholders to usable baseline operations.

## Changes

- `src/utils/udsClient.ts`
  - Expanded live session metadata parsing from session PID registry:
    - added `logPath`, `status`, `waitingFor` fields to `LiveSessionInfo`
    - keeps existing `pid/sessionId/cwd/messagingSocketPath/name/bridgeSessionId`

- `src/cli/bg.ts`
  - `ps` now prints richer live session rows:
    - `PID SESSION KIND STATUS CWD`
  - `logs <sessionId>` now attempts real log read:
    - resolves target by `pid/sessionId/bridgeSessionId`
    - reads `logPath` if registered
    - prints last 200 lines
  - `attach <sessionId>` now attempts tmux attach:
    - resolves target by `pid/sessionId/bridgeSessionId`
    - requires session `name` (tmux session id) + local `tmux` availability
    - executes `tmux attach-session -t <name>` with inherited stdio
  - `kill` path (from prior rounds) remains live and unchanged.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- `node reconstructed-client/claude-client.mjs --help`
  - executable help output normal.
