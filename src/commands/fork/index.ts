import type { Command } from '../../commands.js'
import type { LocalCommandCall } from '../../types/command.js'

const call: LocalCommandCall = async args => {
  const directive = args.trim()
  return {
    type: 'text',
    value: directive
      ? `Fork subagent command entry is reconstructed, but full /fork execution pipeline is not fully restored yet.\nDirective: ${directive}`
      : 'Fork subagent command entry is reconstructed, but full /fork execution pipeline is not fully restored yet.',
  }
}

const fork = {
  type: 'local',
  name: 'fork',
  description: 'Run a forked subagent',
  argumentHint: '<directive>',
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
} satisfies Command

export default fork
