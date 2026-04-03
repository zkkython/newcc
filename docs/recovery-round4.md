# Recovery Round 4 (Runtime Path Stitching)

## Completed

Replaced high-impact runtime stubs on CLI fast paths and direct-connect server surfaces:

1. [`src/environment-runner/main.ts`](/Users/kason/pythonwork/claude-code/src/environment-runner/main.ts)
2. [`src/self-hosted-runner/main.ts`](/Users/kason/pythonwork/claude-code/src/self-hosted-runner/main.ts)
3. [`src/server/backends/dangerousBackend.ts`](/Users/kason/pythonwork/claude-code/src/server/backends/dangerousBackend.ts)
4. [`src/server/sessionManager.ts`](/Users/kason/pythonwork/claude-code/src/server/sessionManager.ts)
5. [`src/server/serverLog.ts`](/Users/kason/pythonwork/claude-code/src/server/serverLog.ts)
6. [`src/server/serverBanner.ts`](/Users/kason/pythonwork/claude-code/src/server/serverBanner.ts)
7. [`src/server/lockfile.ts`](/Users/kason/pythonwork/claude-code/src/server/lockfile.ts)
8. [`src/server/parseConnectUrl.ts`](/Users/kason/pythonwork/claude-code/src/server/parseConnectUrl.ts)
9. [`src/server/connectHeadless.ts`](/Users/kason/pythonwork/claude-code/src/server/connectHeadless.ts)
10. [`src/server/server.ts`](/Users/kason/pythonwork/claude-code/src/server/server.ts)
11. [`src/assistant/AssistantSessionChooser.ts`](/Users/kason/pythonwork/claude-code/src/assistant/AssistantSessionChooser.ts) (re-export to tsx implementation)

## Behavioral Notes

- `server` command now has a minimal executable HTTP runtime (`/health`, `POST /sessions`) with bearer-token auth.
- `SessionManager` now enforces max session cap and provides create/get/destroy lifecycle methods.
- Lockfile operations (`write/remove/probe`) are restored for single-instance guard behavior.
- `claude open <cc-url> -p` headless path now has a deterministic fallback output implementation.
- `cc+unix://` parsing currently fails fast with explicit unsupported message in reconstructed mode.

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

- Before round: `123`
- After round: `112`
- Reduced: `11`

## Remaining Gaps

1. Direct-connect WebSocket streaming path is placeholder-only in this round.
2. `cc+unix://` transport not reimplemented yet.
3. `environment-runner` / `self-hosted-runner` are command-shell scaffolds, not protocol-complete workers.

## Next Focus (Round 5)

1. Implement direct-connect WebSocket endpoint and session IO bridging in [`src/server/server.ts`](/Users/kason/pythonwork/claude-code/src/server/server.ts).
2. Restore `cc+unix://` socket transport end-to-end (`parse` + `create session` + `connect`).
3. Continue replacing runtime stubs under high-fanout utility paths (`uds*`, `daemon/workerRegistry`, `cli/transports`).
