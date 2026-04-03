# Recovery Round 40

Date: 2026-04-02

## Scope
Continue closing command-surface gaps by replacing remaining "partially reconstructed" command responses with executable local behavior.

## Changes

- `src/commands/buddy/index.ts`
  - Replaced passive status-only placeholder path with operational command handling.
  - Added `/buddy` subcommands:
    - `hatch [name]` (creates and persists companion soul)
    - `rename <name>`
    - `mute` / `unmute`
    - `release`
    - default status output and `help`
  - Persisted companion mutations through `saveGlobalConfig(...)`.
  - Added deterministic default soul generation seeded by user identity.

- `src/commands/workflows/index.ts`
  - Replaced placeholder messaging with local workflow registry + execution.
  - Added `/workflows` subcommands:
    - `list`
    - `show <name>`
    - `add <name> <prompt...>`
    - `run <name> [args...]` (supports `$ARGS` / `$ARGUMENTS` substitution)
    - default help/status output
  - Stores workflow templates under `~/.claude/workflows/*.md`.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- `rg -n "partially reconstructed|full buddy interaction command flow|Workflow scripts command surface" src/commands/buddy/index.ts src/commands/workflows/index.ts`
  - no matches
