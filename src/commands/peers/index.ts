import type { Command } from '../../commands.js'
import type { LocalCommandCall } from '../../types/command.js'
import { listAllLiveSessions } from '../../utils/udsClient.js'

const call: LocalCommandCall = async () => {
  const sessions = await listAllLiveSessions()
  if (sessions.length === 0) {
    return {
      type: 'text',
      value:
        'No live peers discovered (UDS peer registry is not fully reconstructed yet).',
    }
  }

  const lines = sessions.map((s, i) => {
    const kind = s.kind ?? 'unknown'
    const id = s.sessionId ?? 'unknown'
    return `${i + 1}. ${kind} (${id})`
  })

  return {
    type: 'text',
    value: `Live peers:\n${lines.join('\n')}`,
  }
}

const peers = {
  type: 'local',
  name: 'peers',
  description: 'List live local peer sessions discovered via UDS',
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
} satisfies Command

export default peers
