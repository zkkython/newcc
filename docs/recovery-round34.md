# Recovery Round 34

Date: 2026-04-01

## Scope
Replace remaining CLI placeholders on the command surface for `rollback` and `ant` handlers with executable reconstructed behavior.

## Changes

- `src/cli/rollback.ts`
  - Replaced static unavailable output with runnable rollback flow.
  - Added target resolution:
    - `--safe` -> resolves via `getMaxVersion()`
    - no target -> one version back from npm history
    - numeric target (e.g. `3`) -> N versions back
    - explicit semver string -> direct install target
  - Added `--list` support using `getVersionHistory(...)`.
  - Added `--dry-run` output path.
  - Wired install backends by detected install type:
    - `native` -> `installLatestNative(version, true)`
    - `npm-local` -> `installOrUpdateClaudePackage('latest', version)`
    - fallback/global -> `installGlobalPackage(version)`

- `src/cli/handlers/ant.ts`
  - Replaced all placeholder handlers with executable implementations.
  - `log`:
    - list recent logs
    - render a specific log by index/sessionId
  - `error`:
    - list error logs
    - print selected error log content by index
  - `export`:
    - resolve source from log index / sessionId / local transcript file
    - render via `renderMessagesToPlainText(...)`
    - write to target output file
  - `task` subcommands:
    - `create`, `list`, `get`, `update`, `dir` now use `utils/tasks.ts`
  - `completion`:
    - generates shell completion scripts for `bash` / `zsh` / `fish`
    - supports `--output` writing

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- `node reconstructed-client/claude-client.mjs --help`
  - executable help output normal.

