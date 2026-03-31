# Recovery Workflow

## 1) Scan missing imports

```bash
node scripts/recovery/scan-missing-imports.mjs
```

Generates [`recovery-manifest.json`](/Users/kason/pythonwork/claude-code/recovery-manifest.json) with:

- unresolved module list
- inferred named/default import contracts
- consumer mapping and ref counts

## 2) Generate stub modules

```bash
node scripts/recovery/generate-recovery-stubs.mjs
```

Behavior:

- creates missing files under `src/`
- preserves 5 core modules for manual implementations:
  - `src/types/message.ts`
  - `src/types/tools.ts`
  - `src/types/utils.ts`
  - `src/constants/querySource.ts`
  - `src/entrypoints/sdk/controlTypes.ts`

## 3) Re-scan to verify closure

```bash
node scripts/recovery/scan-missing-imports.mjs
```

Current result (this pass):

- `unresolvedImportRefs = 0`
- `unresolvedModuleCount = 0`

## Important limitation

This pass restores **module graph integrity** (imports resolve), not full behavioral parity.
Auto-generated stubs use permissive `any`-style contracts and must be replaced module-by-module for true runtime equivalence.
