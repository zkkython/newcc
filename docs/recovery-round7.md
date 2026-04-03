# Recovery Round 7 (Direct-Connect Fallback + Bridge Utilities)

## Completed

Replaced/reworked runtime behavior in direct-connect and bridge helper paths:

1. [`src/server/directConnectManager.ts`](/Users/kason/pythonwork/claude-code/src/server/directConnectManager.ts)
2. [`src/bridge/peerSessions.ts`](/Users/kason/pythonwork/claude-code/src/bridge/peerSessions.ts)
3. [`src/bridge/webhookSanitizer.ts`](/Users/kason/pythonwork/claude-code/src/bridge/webhookSanitizer.ts)

## Behavioral Notes

- `DirectConnectSessionManager` now supports reconstructed fallback mode:
  - If WebSocket setup/connection fails before first successful connect, it degrades to in-process loopback mode.
  - Fallback emits a synthetic `system/init` and returns synthetic `assistant` + `result` messages on `sendMessage`.
  - This prevents immediate hard-disconnect in REPL direct-connect flows on missing WS runtime.
- `postInterClaudeMessage()` now returns explicit `ok: false` with actionable error text (instead of proxy no-op).
- `sanitizeInboundWebhookContent()` now performs minimal text hardening by stripping unsafe control chars from inbound webhook content.

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

- Before round: `101`
- After round: `99`
- Reduced: `2`

## Remaining Gaps

1. True direct-connect websocket endpoint and real server-side streaming protocol are still not rebuilt.
2. Bridge peer session forwarding is explicit fail-fast placeholder (no transport yet).
3. Remaining stubs are now mostly in auxiliary tools/workflow/skills modules.

## Next Focus (Round 8)

1. Add server-side `/sessions/:id/messages` endpoint + direct-connect manager HTTP path (reduce dependency on WS).
2. Replace high-fanout stubs under `services/skillSearch/*`.
3. Replace runtime stubs in `tasks/*` and related dialogs used by workflow paths.
