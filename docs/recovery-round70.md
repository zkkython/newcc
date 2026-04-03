# Recovery Round 70

Date: 2026-04-02

## Scope
Enable direct startup of recovered `src` CLI under Bun by completing local dependency hydration and runtime-compat fixes.

## Changes

- Dependency hydration to repo-local `package.json`/`bun.lock`/`node_modules` continued until `src` CLI startup probe cleared missing-package failures.
- Startup compatibility fixes:
  - `src/plugins/bundled/index.ts`
    - `feature('ANT_DEBUG')` usage rewritten into Bun-compatible pattern via precomputed ternary value.
  - `src/utils/claudeInChrome/setup.ts`
    - replaced hard import of private package `@ant/claude-for-chrome-mcp` with optional runtime `createRequire()` loading and empty fallback.
  - `src/skills/bundled/claudeInChrome.ts`
    - same optional loading fallback for private package to avoid startup hard-fail in public environment.
  - `src/ink/components/Box.tsx`
    - removed runtime import of `../global.d.ts`.
  - `src/components/StructuredDiff/colorDiff.ts`
    - switched from external `color-diff-napi` to local `src/native-ts/color-diff` implementation.
  - `src/main.tsx`
    - replaced invalid commander short flag `-d2e` with long-only `--debug-to-stderr`.
    - replaced build-time-only `MACRO.VERSION` usage with runtime-safe `BUILD_VERSION` fallback.
  - `src/entrypoints/cli.tsx`
    - same runtime-safe `BUILD_VERSION` fallback.

## Validation

- Direct startup probe now succeeds:
  - `NODE_PATH=. ~/.bun/bin/bun src/entrypoints/cli.tsx --help`
- Unified recovery checks still pass:
  - `node scripts/recovery/run-bridge-recovery-checks.mjs`
  - import closure remains `0/0/0` unresolved refs/edges/modules.
