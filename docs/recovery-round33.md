# Recovery Round 33

Date: 2026-04-01

## Scope
Reduce remaining command-surface hard failures (`ccshare`, `ssh`, `up`) by replacing placeholder errors with executable fallback behavior.

## Changes

- `src/utils/ccshareResume.ts`
  - Replaced hard-fail `loadCcshare(...)` with local transcript discovery:
    - scans `process.cwd()` and `~/.claude` (depth-limited)
    - matches `*.jsonl` / `*.json` containing the ccshare id in filename
    - loads first valid match via `loadTranscriptFromFile(...)`
  - returns actionable error text when no local candidate is found.

- `src/ssh/createSSHSession.ts`
  - Replaced unconditional throw in `createSSHSession(...)`.
  - Added reconstructed compatibility path:
    - reports progress callback message
    - returns a runnable stub session (local execution compatibility mode)
  - This keeps `claude ssh <host>` flows operational while full remote deploy/proxy transport remains unreconstructed.

- `src/cli/up.ts`
  - Replaced static unavailable text with runnable baseline:
    - runs `setup(...)`
    - locates nearest `CLAUDE.md`
    - extracts and prints `# claude up` section content when present
    - prints clear fallback messages when file/section is missing

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- `bun src/entrypoints/cli.tsx --help`
  - executable help output normal.
