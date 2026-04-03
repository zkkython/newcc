import { getRemoteSessionUrl } from '../../constants/product.js'
import { teleportToRemote } from '../../utils/teleport.js'

const call = async args => {
  const description = args.trim() || null
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120000)
  try {
    const result = await teleportToRemote({
      initialMessage: description,
      description: description ?? undefined,
      signal: controller.signal,
    })
    if (!result) {
      return {
        type: 'text',
        value:
          'Teleport could not create a remote session. Check authentication and repo preconditions, then retry.',
      }
    }
    const url = getRemoteSessionUrl(result.id)
    return {
      type: 'text',
      value: [
        `Created remote session: ${result.id}`,
        `Title: ${result.title}`,
        `Open: ${url}`,
      ].join('\n'),
    }
  } finally {
    clearTimeout(timeout)
  }
}

export default {
  type: 'local',
  name: 'teleport',
  description: 'Prepare a local teleport manifest for session handoff',
  isHidden: true,
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
}
