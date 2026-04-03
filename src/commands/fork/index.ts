import type { Command } from '../../commands.js'
import type { LocalCommandCall } from '../../types/command.js'
import { FORK_DIRECTIVE_PREFIX } from '../../constants/xml.js'

const call: LocalCommandCall = async args => {
  const directive = args.trim()
  if (!directive) {
    return {
      type: 'text',
      value:
        'Usage: /fork <directive>\nExample: /fork investigate why login retries fail under load',
    }
  }

  return {
    type: 'text',
    value: [
      'Run this as a forked background worker.',
      'Use the Agent tool without specifying subagent_type so fork mode is used.',
      'Do the work directly with tools, then return a concise scoped report.',
      `${FORK_DIRECTIVE_PREFIX}${directive}`,
    ].join('\n'),
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
