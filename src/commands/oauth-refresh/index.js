import { checkAndRefreshOAuthTokenIfNeeded } from '../../utils/auth.js'

const call = async () => {
  try {
    const ok = await checkAndRefreshOAuthTokenIfNeeded(0, true)
    return {
      type: 'text',
      value: ok
        ? 'OAuth refresh completed successfully.'
        : 'OAuth refresh did not update credentials (no valid OAuth session).',
    }
  } catch (error) {
    return {
      type: 'text',
      value: `OAuth refresh failed: ${String(error)}`,
    }
  }
}

export default {
  type: 'local',
  name: 'oauth-refresh',
  description: 'Force-refresh OAuth credentials',
  isHidden: true,
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
}
