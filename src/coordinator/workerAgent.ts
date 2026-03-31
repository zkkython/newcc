import type { AgentDefinition } from '../tools/AgentTool/loadAgentsDir.js'

function buildCoordinatorAgent(
  agentType: string,
  whenToUse: string,
  prompt: string,
): AgentDefinition {
  return {
    source: 'built-in',
    baseDir: 'built-in',
    agentType,
    whenToUse,
    getSystemPrompt: () => prompt,
  }
}

export function getCoordinatorAgents(): AgentDefinition[] {
  return [
    buildCoordinatorAgent(
      'coordinator',
      'Coordinate multi-agent execution and route work.',
      'You are a coordinator agent. Break work into clear, independent slices and delegate carefully.',
    ),
    buildCoordinatorAgent(
      'worker',
      'Execute delegated implementation tasks.',
      'You are a worker agent. Execute assigned tasks directly and report concise factual outcomes.',
    ),
  ]
}
