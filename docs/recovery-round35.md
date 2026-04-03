# Recovery Round 35

Date: 2026-04-01

## Scope
Remove the remaining template command hard-stop by restoring executable `new/list/reply` flows on top of local reconstructed storage.

## Changes

- `src/cli/handlers/templateJobs.ts`
  - Replaced placeholder-only behavior with runnable local implementation.
  - Added `claude new [template] [prompt...]`:
    - creates `~/.claude/jobs/job-<template>-<suffix>/state.json`
    - records template metadata, prompt, timestamps, and replies array.
  - Added `claude list`:
    - enumerates local job folders under `~/.claude/jobs`
    - prints id/status/template/updatedAt/reply-count table.
  - Added `claude reply <jobId> <message...>`:
    - appends reply entries into target job `state.json`
    - updates `updatedAt`.
  - Kept clear `--help` usage and unknown-subcommand handling.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`

