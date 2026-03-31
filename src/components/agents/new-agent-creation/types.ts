import type { AgentDefinition } from '../../../tools/AgentTool/loadAgentsDir.js'

export type AgentWizardData = {
  location?: string
  agentType?: string
  whenToUse?: string
  systemPrompt?: string
  selectedTools?: string[]
  selectedModel?: string
  selectedColor?: string
  generationPrompt?: string
  wasGenerated?: boolean
  memory?: string | null
  finalAgent?: AgentDefinition
}
