# Recovery Round 5 (Entry-Path Runtime Stubs Replacement)

## Completed

Replaced another batch of runtime stubs that are reachable from CLI/main entry flows:

1. [`src/daemon/workerRegistry.ts`](/Users/kason/pythonwork/claude-code/src/daemon/workerRegistry.ts)
2. [`src/cli/handlers/templateJobs.ts`](/Users/kason/pythonwork/claude-code/src/cli/handlers/templateJobs.ts)
3. [`src/cli/up.ts`](/Users/kason/pythonwork/claude-code/src/cli/up.ts)
4. [`src/cli/rollback.ts`](/Users/kason/pythonwork/claude-code/src/cli/rollback.ts)
5. [`src/cli/handlers/ant.ts`](/Users/kason/pythonwork/claude-code/src/cli/handlers/ant.ts)
6. [`src/utils/ccshareResume.ts`](/Users/kason/pythonwork/claude-code/src/utils/ccshareResume.ts)
7. [`src/components/agents/SnapshotUpdateDialog.ts`](/Users/kason/pythonwork/claude-code/src/components/agents/SnapshotUpdateDialog.ts)
8. [`src/ssh/SSHSessionManager.ts`](/Users/kason/pythonwork/claude-code/src/ssh/SSHSessionManager.ts)
9. [`src/ssh/createSSHSession.ts`](/Users/kason/pythonwork/claude-code/src/ssh/createSSHSession.ts)

## Behavioral Notes

- `--daemon-worker <kind>` now has explicit handler and help output.
- Template jobs/ant-only handlers now return deterministic “reconstructed mode unavailable” responses instead of silent no-ops.
- `SnapshotUpdateDialog` is now renderable from `dialogLaunchers.tsx`.
- SSH local mode now has a functional in-process session shim (`createLocalSSHSession` + `SSHSessionManager`) that can connect/send synthetic assistant+result messages.
- Real remote SSH transport (`createSSHSession`) currently fails fast with a clear error directing to `--local`.
- `ccshare` parsing helper is restored; `loadCcshare` still explicit unsupported path in reconstructed mode.

## Validation

1. Import closure scan:

```bash
node scripts/recovery/scan-missing-imports.mjs
```

Result:

- `unresolvedImportRefs = 0`
- `unresolvedImportEdges = 0`
- `unresolvedModuleCount = 0`

2. Reconstructed client smoke:

```bash
bun src/entrypoints/cli.tsx --help
```

Result: executable help output returned.

3. Stub count delta:

- Before round: `112`
- After round: `103`
- Reduced: `9`

## Remaining Gaps

1. Direct-connect WebSocket transport (`/sessions/:id/ws`) is still not reconstructed.
2. Real SSH remote deployment/tunnel/proxy workflow is not reconstructed (only `--local` shim).
3. Many non-entrypoint modules remain stubs (tools, workflow, skill-search, UDS utilities, etc.).

## Next Focus (Round 6)

1. Implement direct-connect websocket endpoint + event bridge for interactive remote mode.
2. Backfill UDS/session-liveness primitives (`src/utils/udsClient.ts`, `src/utils/udsMessaging.ts`) to improve resume/background compatibility.
3. Continue replacing high-fanout runtime stubs under `services/skillSearch` and `tasks/*` paths.
