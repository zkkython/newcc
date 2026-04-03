# Recovery Round 64

Date: 2026-04-02

## Scope
Add executable runner-remote verification and fold it into the unified recovery check chain.

## Changes

- Added runner remote coverage checker:
  - `scripts/recovery/check-runner-remote-coverage.mjs`
  - Verifies key remote-mode invariants across runner components:
    - `RunnerState` includes remote diagnostic fields (`remoteMode/sessionUrl/pollUrl/workerEpoch/lastRemoteOkAt/lastRemoteError`)
    - `environment-runner`:
      - CCR request timeout usage (`AbortController`, 10s)
      - retry helper exists
      - `409` init conflict triggers worker re-register path
      - `--once` performs tick then clears state
      - status output includes remote diagnostics
    - `self-hosted-runner`:
      - poll timeout+retry behavior
      - optional registerWorker bootstrap path
      - `--once` performs tick then clears state
      - status output includes poll+remote diagnostics

- Updated unified recovery runner:
  - `scripts/recovery/run-bridge-recovery-checks.mjs`
  - Added new step: `runner remote coverage`

- Updated reconstruction analysis doc with current coverage list in the unified recovery entrypoint section.

## Validation

- `node scripts/recovery/check-runner-remote-coverage.mjs`
  - passed
- `node scripts/recovery/run-bridge-recovery-checks.mjs`
  - all steps passed
- import graph remains closed via embedded scan:
  - unresolved refs/edges/modules: `0`
