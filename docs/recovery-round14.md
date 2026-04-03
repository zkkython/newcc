# Recovery Round 14

Date: 2026-03-31

## Scope

Continued reconstruction based on `docs/reconstruction-analysis.md`, with focus on removing runtime stubs and restoring callable modules in the execution path.

## Implemented

- Replaced proactive stub with a functional state module in `src/proactive/index.ts`:
  - `activateProactive`, `deactivateProactive`
  - `pauseProactive`, `resumeProactive`
  - `setContextBlocked`, `isProactiveActive`, `isProactivePaused`
  - `getNextTickAt`, `subscribeToProactiveChanges`
- Restored message render components:
  - `src/components/messages/SnipBoundaryMessage.ts`
  - `src/components/messages/UserGitHubWebhookMessage.ts`
  - `src/components/messages/UserCrossSessionMessage.ts`
  - `src/components/messages/UserForkBoilerplateMessage.ts`
- Restored feedback survey support:
  - `src/components/FeedbackSurvey/utils.ts`
  - `src/components/FeedbackSurvey/useFrustrationDetection.ts`
- Restored ant-only notification hook shape:
  - `src/hooks/notifs/useAntOrgWarningNotification.ts`
- Restored ink/event and utility primitives:
  - `src/ink/events/paste-event.ts`
  - `src/ink/events/resize-event.ts`
  - `src/ink/cursor.ts`
  - `src/ink/devtools.ts`
- Restored jobs/memory telemetry plumbing:
  - `src/jobs/classifier.ts` (`classifyAndWriteState`)
  - `src/memdir/memoryShapeTelemetry.ts`
- Restored tool stubs to executable minimal implementations:
  - `src/tools/OverflowTestTool/OverflowTestTool.ts`
  - `src/tools/TungstenTool/TungstenTool.ts`
  - `src/tools/TungstenTool/TungstenLiveMonitor.ts`
  - `src/tools/WebBrowserTool/WebBrowserPanel.ts`
- Restored coordinator agent provider:
  - `src/coordinator/workerAgent.ts` (`getCoordinatorAgents`)
- Replaced all bundled markdown `.md.ts` stubs under `src/skills/bundled/**` with valid default string exports.

## Validation

- `rg -n "__recovery_stub" src | wc -l` → `0`
- `node scripts/recovery/scan-missing-imports.mjs`:
  - `unresolvedImportRefs: 0`
  - `unresolvedImportEdges: 0`
  - `unresolvedModuleCount: 0`
- `bun src/entrypoints/cli.tsx --help` executes successfully.

## Current Status

`src` stub markers are fully eliminated. The reconstructed client remains executable with import graph integrity checks passing.
