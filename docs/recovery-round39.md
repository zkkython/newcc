# Recovery Round 39

Date: 2026-04-02

## Scope
Close the remaining `--bg` execution gap so background mode is runnable instead of informational-only, and remove stale "not restored" wording from daemon help.

## Changes

- `src/cli/bg.ts`
  - Upgraded `handleBgFlag(args)` from static message output to executable launch flow.
  - Added background launch pipeline:
    - strips `--bg/--background`
    - creates log directory under `~/.claude/bg-logs`
    - sets session env (`CLAUDE_CODE_SESSION_KIND=bg`, `CLAUDE_CODE_SESSION_NAME`, `CLAUDE_CODE_SESSION_LOG`)
    - prefers detached `tmux new-session` launch when `tmux` is available
    - best-effort enables tmux pane log piping to the log file
    - falls back to detached process launch with stdout/stderr redirected to log file when tmux is unavailable/fails
  - Updated `bg` help text to reflect real behavior.
  - Added helper utilities for child arg resolution and shell quoting.

- `src/daemon/main.ts`
  - Removed stale help note claiming daemon runtime is not restored.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- `rg -n "foreground mode only|Background execution flag detected" src/cli/bg.ts`
  - no matches
