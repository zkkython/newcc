# Recovery Round 45

Date: 2026-04-02

## Scope
Replace task-summary no-op path used by BG session status updates with a functional local summary emitter.

## Changes

- `src/utils/taskSummary.ts`
  - Replaced no-op `maybeGenerateTaskSummary(...)` with active summary updates.
  - Added summary derivation from recent `forkContextMessages` (tool events + text previews).
  - Now pushes session activity updates via `updateSessionActivity(...)`:
    - `status: 'busy'`
    - `waitingFor: <derived summary>`
  - Keeps existing interval throttling (`TASK_SUMMARY_INTERVAL_MS`).

## Behavioral impact

- `claude ps` now receives periodically refreshed `waitingFor` context from this path instead of stale/empty values on long turns where the task summary scheduler fires.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- source checks confirm `maybeGenerateTaskSummary` now updates session activity state.
