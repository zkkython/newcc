const call = async () => {
  const actions = []

  try {
    const { clearCommandsCache } = await import('../../commands.js')
    clearCommandsCache()
    actions.push('commands cache')
  } catch {
    // ignore
  }

  try {
    const { clearSessionCaches } = await import('../clear/caches.js')
    clearSessionCaches()
    actions.push('session caches')
  } catch {
    // ignore
  }

  if (actions.length === 0) {
    return {
      type: 'text',
      value: 'No cache clear handlers were available.',
    }
  }

  return {
    type: 'text',
    value: `Cleared: ${actions.join(', ')}`,
  }
}

export default {
  type: 'local',
  name: 'break-cache',
  description: 'Invalidate command/session caches',
  isHidden: true,
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
}
