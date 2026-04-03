# Recovery Round 38

Date: 2026-04-01

## Scope
Complete the remaining unavailable internal command wrappers and remove the temporary unavailable-command helper layer.

## Changes

- Replaced last unavailable-wrapper commands with executable reconstructed implementations:
  - `src/commands/teleport/index.js`
    - creates local teleport manifest under `~/.claude/teleport/*.json`.
  - `src/commands/ctx_viz/index.js`
    - provides textual context contribution view with rough per-message token estimates.
  - `src/commands/good-claude/index.js`
    - runs quick local health checks (`git status`, branch, recovery scan output).
  - `src/commands/ant-trace/index.js`
    - writes trace snapshot JSON under `~/.claude/traces/*.json`.

- Removed temporary unavailable-command helper:
  - deleted `src/commands/reconstructedUnavailable.js`.

## Validation

- `rg "createReconstructedUnavailableCommand\\(|name: 'stub'|not fully restored yet|currently unavailable in reconstructed mode" src`
  - no matches
- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`

