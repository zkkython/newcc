# Recovery Round 17

Date: 2026-04-01

## Scope
Upgrade `agentSdkTypes.query(...)` from fallback-only behavior to real internal runtime execution for full `QueryParams` callers.

## Changes

- Updated `src/entrypoints/agentSdkTypes.ts`:
  - Added internal wiring to `src/query.ts`:
    - `import { query as queryImpl, type QueryParams as InternalQueryParams } from '../query.js'`
  - Added overload:
    - `query(params: InternalQueryParams): ReturnType<typeof queryImpl>`
  - Implemented runtime dispatch:
    - If input shape matches internal query payload (`messages/systemPrompt/toolUseContext`), delegate to real `queryImpl(...)`.
    - Keep prompt-style SDK shape (`{ prompt, options }`) on executable fallback path.

## Effect

- Internal call sites using `query({ messages, systemPrompt, ... })` now execute the actual query engine instead of receiving a synthetic error result.
- Public prompt-style surface remains non-throwing and executable in reconstruction mode.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- `bun src/entrypoints/cli.tsx --help`
  - executable help output normal.

## Remaining gap

- `connectRemoteControl(...)` is still fallback (`null`) and not yet bridged to the full remote control transport path.
