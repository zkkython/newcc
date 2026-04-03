# Recovery Round 43

Date: 2026-04-02

## Scope
Connect attribution hook registration path to actual hook installation and improve hook path resolution across normal repos/worktrees/submodules.

## Changes

- `src/utils/attributionHooks.ts`
  - Replaced no-op `registerAttributionHooks()` with executable behavior:
    - resolves canonical git root from current cwd
    - installs `prepare-commit-msg` hook via `installPrepareCommitMsgHook(...)`
    - logs installation failures as debug errors (non-fatal)

- `src/utils/postCommitAttribution.ts`
  - Added `.git` shape-aware hook directory resolution:
    - `.git` directory => `<repo>/.git/hooks`
    - `.git` file (`gitdir: ...`) => `<resolved gitdir>/hooks`
    - fallback => `<repo>/.git/hooks`
  - Keeps existing non-clobber behavior for non-Claude hooks and marker-based idempotent update path.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- source checks confirm registration and gitdir-aware resolution are present.
