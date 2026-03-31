# Recovery Round 9

Date: 2026-03-31

## Scope

- Replace command stubs for:
  - `src/commands/peers/index.ts`
  - `src/commands/workflows/index.ts`
  - `src/commands/buddy/index.ts`
  - `src/commands/fork/index.ts`
- Reconstruct task modules:
  - `src/tasks/LocalWorkflowTask/LocalWorkflowTask.ts`
  - `src/tasks/MonitorMcpTask/MonitorMcpTask.ts`
- Reconstruct background-task detail UI placeholders:
  - `src/components/tasks/WorkflowDetailDialog.ts`
  - `src/components/tasks/MonitorMcpDetailDialog.ts`
- Replace type stubs:
  - `src/commands/plugin/types.ts`
  - `src/commands/plugin/unifiedTypes.ts`
  - `src/commands/install-github-app/types.ts`

## What Was Added

- Slash commands `/peers /workflows /buddy /fork` now export valid `Command` objects and execute with local handlers.
- `LocalWorkflowTask` now exports:
  - `LocalWorkflowTaskState` (typed shape)
  - `isLocalWorkflowTask`
  - `killWorkflowTask`
  - `skipWorkflowAgent`
  - `retryWorkflowAgent`
  - `LocalWorkflowTask` (`Task` implementation)
- `MonitorMcpTask` now exports:
  - `MonitorMcpTaskState` (typed shape)
  - `isMonitorMcpTask`
  - `killMonitorMcp`
  - `killMonitorMcpTasksForAgent`
  - `MonitorMcpTask` (`Task` implementation)
- Workflow/monitor detail dialogs now render minimal, functional detail panes and keyboard actions.
- Plugin/install-github-app type files now define concrete unions/interfaces consumed by existing components.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - `unresolvedImportRefs: 0`
  - `unresolvedImportEdges: 0`
  - `unresolvedModuleCount: 0`
- `node reconstructed-client/claude-client.mjs --help`
  - Runs successfully.

## Stub Count

- Before this round: `92`
- After command/task/dialog/type reconstruction: `81`
