# Recovery Round 42

Date: 2026-04-02

## Scope
Upgrade runner command scaffolds to support optional remote worker protocol flows (register/heartbeat/poll) while preserving local lifecycle behavior.

## Changes

- `src/utils/runnerState.ts`
  - Extended `RunnerState` with remote health metadata:
    - `remoteMode`
    - `sessionUrl`
    - `pollUrl`
    - `workerEpoch`
    - `lastRemoteOkAt`
    - `lastRemoteError`

- `src/environment-runner/main.ts`
  - Added optional remote CCR worker mode for `start`:
    - `--session-url <url>` / `CLAUDE_CODE_RUNNER_SESSION_URL`
    - `--access-token <token>` / `CLAUDE_CODE_SESSION_ACCESS_TOKEN`
    - `--worker-epoch <n>` / `CLAUDE_CODE_WORKER_EPOCH`
    - `--register-worker` / `CLAUDE_CODE_REGISTER_WORKER=1`
  - Remote flow:
    - optional `POST /worker/register` (via `registerWorker(...)`) to obtain epoch
    - startup `PUT /worker` state publish
    - periodic `POST /worker/heartbeat`
  - Local heartbeat/state file loop remains intact; remote failures are recorded in state (`lastRemoteError`) and surfaced as warnings without crashing loop.

- `src/self-hosted-runner/main.ts`
  - Added optional remote poll-worker mode for `start`:
    - `--poll-url <url>` / `CLAUDE_CODE_SELF_HOSTED_RUNNER_POLL_URL`
    - optional session/token/epoch/register args/env (same shape as environment-runner)
  - Remote flow:
    - optional register for epoch when session URL + token + register flag are provided
    - periodic POST poll payload to `pollUrl` (poll acts as heartbeat)
  - Local heartbeat/state file loop remains intact with remote status persisted.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- grep checks confirm new runner flags/state fields are wired in source.
