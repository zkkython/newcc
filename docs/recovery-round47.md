# Recovery Round 47

Date: 2026-04-02

## Scope
Fix runner one-shot lifecycle correctness and improve status introspection for remote mode debugging.

## Changes

- `src/environment-runner/main.ts`
  - Fixed `--once` behavior to avoid stale state files:
    - performs one remote tick (if configured)
    - writes heartbeat
    - clears runner state before exit
  - Expanded `status` output to include remote metadata:
    - `remoteMode`
    - `sessionUrl`
    - `workerEpoch`
    - `lastRemoteOkAt`
    - `lastRemoteError`

- `src/self-hosted-runner/main.ts`
  - Fixed `--once` behavior similarly:
    - one remote poll tick
    - heartbeat write
    - state cleanup before exit
  - Expanded `status` output to include:
    - `remoteMode`
    - `sessionUrl`
    - `pollUrl`
    - `workerEpoch`
    - `lastRemoteOkAt`
    - `lastRemoteError`

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- source checks confirm one-shot cleanup and remote fields are present in status payloads.
