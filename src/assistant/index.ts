import type { AppState } from '../state/AppState.js'
import { getInitialSettings } from '../utils/settings/settings.js'
import { setCliTeammateModeOverride } from '../utils/swarm/backends/teammateModeSnapshot.js'

let assistantForced = false

export function markAssistantForced(): void {
  assistantForced = true
}

export function isAssistantForced(): boolean {
  return assistantForced
}

export function isAssistantMode(): boolean {
  if (assistantForced) return true
  if (process.env.CLAUDE_CODE_FORCE_ASSISTANT === '1') return true
  return getInitialSettings().assistant === true
}

export function getAssistantActivationPath(): string | undefined {
  if (assistantForced) return 'flag:--assistant'
  if (process.env.CLAUDE_CODE_FORCE_ASSISTANT === '1') return 'env:CLAUDE_CODE_FORCE_ASSISTANT'
  if (getInitialSettings().assistant === true) return 'settings:assistant=true'
  return undefined
}

export function getAssistantSystemPromptAddendum(): string {
  return [
    '## Assistant Mode',
    'You are running in assistant mode.',
    'Prefer proactive progress updates and concise operational messaging.',
  ].join('\n')
}

export async function initializeAssistantTeam(): Promise<AppState['teamContext']> {
  // Ensure assistant mode uses in-process teammate behavior by default.
  setCliTeammateModeOverride('in-process')

  const now = Date.now()
  return {
    teamName: 'assistant',
    teamFilePath: '',
    leadAgentId: 'team-lead',
    selfAgentId: 'team-lead',
    selfAgentName: 'team-lead',
    isLeader: true,
    teammates: {
      'team-lead': {
        name: 'team-lead',
        tmuxSessionName: '',
        tmuxPaneId: '',
        cwd: process.cwd(),
        spawnedAt: now,
      },
    },
  }
}
