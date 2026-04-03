# Recovery Round 37

Date: 2026-04-01

## Scope
Move internal command surface from disabled placeholders to executable reconstructed implementations, focusing on operational/debug workflows.

## Changes

- Restored executable internal commands:
  - `src/commands/env/index.js`
    - outputs runtime/auth/session diagnostics JSON.
  - `src/commands/summary/index.js`
    - summarizes in-memory message counts and last user/assistant previews.
  - `src/commands/share/index.js`
    - writes a local share manifest under `~/.claude/shares/<id>.json`.
  - `src/commands/break-cache/index.js`
    - clears command/session caches via existing cache clear functions.
  - `src/commands/onboarding/index.js`
    - prints onboarding/auth status + recommended next actions.
  - `src/commands/mock-limits/index.js`
    - supports scenario selection and status output using `mockRateLimits`.
  - `src/commands/reset-limits/index.js`
    - clears mocked rate-limit state.
  - `src/commands/oauth-refresh/index.js`
    - forces OAuth token refresh path.
  - `src/commands/debug-tool-call/index.js`
    - prints snapshot of last API request / classifier request state.
  - `src/commands/backfill-sessions/index.js`
    - runs a local session metadata warm scan and reports count.
  - `src/commands/issue/index.js`
    - creates issue draft markdown under `.claude/issues/`.
  - `src/commands/perf-issue/index.js`
    - creates perf issue draft markdown under `.claude/issues/`.
  - `src/commands/autofix-pr/index.js`
    - creates local autofix plan scaffold under `.claude/autofix-pr/`.
  - `src/commands/bughunter/index.js`
    - creates local bug triage snapshot with git branch/status/commits.

- Prior round continuity:
  - `src/environment-runner/main.ts` and `src/self-hosted-runner/main.ts` now support runnable lifecycle commands (`start/status/stop/help`).
  - `src/commands/fork/index.ts` now returns actionable fork directive output.
  - Shared runner state utility added at `src/utils/runnerState.ts`.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- Remaining unavailable-wrapper commands (count 4):
  - `teleport`, `ctx_viz`, `good-claude`, `ant-trace`

