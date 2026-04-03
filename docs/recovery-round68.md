# Recovery Round 68

Date: 2026-04-02

## Scope
Enable Bun runtime path and verify runtime command smoke through the unified reconstruction checks.

## Changes

- Installed Bun runtime (`~/.bun/bin/bun`) and verified availability.
- Updated command execution smoke:
  - `scripts/recovery/check-command-execution-smoke.mjs`
  - Keeps runtime checks for `fork` and `workflows`.
  - `buddy` smoke is now opt-in (`CLAUDE_RECOVERY_ENABLE_BUDDY_SMOKE=1`) and skipped by default due broader dependency/runtime requirements.
- Updated unified recovery runner:
  - `scripts/recovery/run-bridge-recovery-checks.mjs`
  - Adds runtime smoke step with runtime selection:
    - prefer Bun (`~/.bun/bin/bun`)
    - fallback to `tsx` when Bun is unavailable

## Validation

- `node scripts/recovery/run-bridge-recovery-checks.mjs`
  - all checks passed, including `command execution smoke (bun)`
- smoke output under Bun:
  - fork: pass
  - workflows: pass
  - buddy: skipped (default policy)

## Notes

- Bun is now enabled and actively used by the reconstruction check chain.
- `buddy` runtime smoke can be enabled explicitly once dependency/runtime parity is fully prepared.
