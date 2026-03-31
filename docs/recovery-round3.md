# Recovery Round 3 (Type Contract Backfill)

## Completed

Replaced 14 high-reference placeholder type modules with concrete contracts:

1. [`src/services/oauth/types.ts`](/Users/kason/pythonwork/claude-code/src/services/oauth/types.ts)
2. [`src/utils/secureStorage/types.ts`](/Users/kason/pythonwork/claude-code/src/utils/secureStorage/types.ts)
3. [`src/keybindings/types.ts`](/Users/kason/pythonwork/claude-code/src/keybindings/types.ts)
4. [`src/types/connectorText.ts`](/Users/kason/pythonwork/claude-code/src/types/connectorText.ts)
5. [`src/entrypoints/sdk/runtimeTypes.ts`](/Users/kason/pythonwork/claude-code/src/entrypoints/sdk/runtimeTypes.ts)
6. [`src/entrypoints/sdk/sdkUtilityTypes.ts`](/Users/kason/pythonwork/claude-code/src/entrypoints/sdk/sdkUtilityTypes.ts)
7. [`src/components/Spinner/types.ts`](/Users/kason/pythonwork/claude-code/src/components/Spinner/types.ts)
8. [`src/query/transitions.ts`](/Users/kason/pythonwork/claude-code/src/query/transitions.ts)
9. [`src/types/fileSuggestion.ts`](/Users/kason/pythonwork/claude-code/src/types/fileSuggestion.ts)
10. [`src/types/statusLine.ts`](/Users/kason/pythonwork/claude-code/src/types/statusLine.ts)
11. [`src/types/messageQueueTypes.ts`](/Users/kason/pythonwork/claude-code/src/types/messageQueueTypes.ts)
12. [`src/types/notebook.ts`](/Users/kason/pythonwork/claude-code/src/types/notebook.ts)
13. [`src/components/mcp/types.ts`](/Users/kason/pythonwork/claude-code/src/components/mcp/types.ts)
14. [`src/services/lsp/types.ts`](/Users/kason/pythonwork/claude-code/src/services/lsp/types.ts)

## Validation

1. Import closure scan:

```bash
node scripts/recovery/scan-missing-imports.mjs
```

Result:

- `unresolvedImportRefs = 0`
- `unresolvedImportEdges = 0`
- `unresolvedModuleCount = 0`

2. Executable reconstructed client smoke test:

```bash
node reconstructed-client/claude-client.mjs --help
```

Result: CLI usage/help output is returned and executable entrypoint works.

## Current Recovery State

- Stub marker files remaining (`__recovery_stub = true`): `129`
- Module graph remains closed.
- High-frequency type contracts now mostly explicit instead of `any` proxies.

## Next Focus (Round 4)

1. Replace behavior-critical runtime stubs (not only type aliases):
   - `src/cli/bg.ts`
   - `src/daemon/*`
   - `src/environment-runner/*`
   - `src/self-hosted-runner/*`
2. Prioritize modules imported from entrypoints (`main.tsx`, `query.ts`, `cli/print.ts`) for first executable parity.
3. Add a project-level typecheck/build script entry so future rounds can be regression-gated automatically.
