import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import type { Command } from '../../types/command.js'
import { getBundledWorkflows } from './bundled/index.js'

export async function getWorkflowCommands(_cwd: string): Promise<Command[]> {
  const workflows = getBundledWorkflows()
  return workflows.map(workflow => ({
    type: 'prompt',
    source: 'bundled',
    kind: 'workflow',
    name: workflow.name,
    description: workflow.description,
    contentLength: workflow.prompt.length,
    disableModelInvocation: workflow.disableModelInvocation ?? false,
    async getPromptForCommand(args): Promise<ContentBlockParam[]> {
      const trimmed = args.trim()
      const suffix =
        trimmed.length > 0
          ? `\n\nUser-supplied workflow arguments:\n${trimmed}`
          : ''
      return [
        {
          type: 'text',
          text: `${workflow.prompt}${suffix}`,
        },
      ]
    },
  }))
}
