# Recovery Round 6 (UDS Messaging Baseline)

## Completed

Replaced UDS messaging/client stubs used by setup, print-mode, and send-message flows:

1. [`src/utils/udsMessaging.ts`](/Users/kason/pythonwork/claude-code/src/utils/udsMessaging.ts)
2. [`src/utils/udsClient.ts`](/Users/kason/pythonwork/claude-code/src/utils/udsClient.ts)

## Behavioral Notes

- `startUdsMessaging(path)` now binds a Unix domain socket server (non-Windows), exports `CLAUDE_CODE_MESSAGING_SOCKET`, and supports callback registration via `setOnEnqueue`.
- `getDefaultUdsSocketPath()` / `getUdsMessagingSocketPath()` now return deterministic values.
- `sendToUdsSocket(path, message)` now opens a socket and writes JSONL payload.
- `listAllLiveSessions()` currently returns an empty list (registry persistence not restored yet).

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

- Before round: `103`
- After round: `101`
- Reduced: `2`

## Remaining Gaps

1. UDS live-session registry / introspection protocol is not restored (`listAllLiveSessions` placeholder return).
2. Direct-connect websocket transport and remote SSH deploy path are still incomplete.
3. Remaining runtime stubs are concentrated in skills/tools/task/workflow auxiliary modules.

## Next Focus (Round 7)

1. Implement direct-connect websocket (`/sessions/:id/ws`) minimal loopback session transport.
2. Backfill `bridge/peerSessions.ts` and `bridge/webhookSanitizer.ts` to unblock cross-session message paths.
3. Continue replacing runtime stubs that are dynamically imported from `main.tsx` first.
