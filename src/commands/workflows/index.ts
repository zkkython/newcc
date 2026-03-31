import type { Command } from '../../commands.js'
import type { LocalCommandCall } from '../../types/command.js'

const call: LocalCommandCall = async args => {
  const trimmed = args.trim()
  const hint = trimmed ? `\nRequested args: ${trimmed}` : ''
  return {
    type: 'text',
    value:
      'Workflow scripts command surface is available, but full workflow runtime is only partially reconstructed in this build.' +
      hint,
  }
}

const workflows = {
  type: 'local',
  name: 'workflows',
  aliases: ['workflow'],
  description: 'Inspect workflow subsystem status',
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
} satisfies Command

export default workflows
