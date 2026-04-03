import { loadAllProjectsMessageLogs } from '../../utils/sessionStorage.js'

const call = async () => {
  try {
    const logs = await loadAllProjectsMessageLogs()
    return {
      type: 'text',
      value: `Backfill scan completed. Loaded ${logs.length} sessions from local storage.`,
    }
  } catch (error) {
    return {
      type: 'text',
      value: `Backfill scan failed: ${String(error)}`,
    }
  }
}

export default {
  type: 'local',
  name: 'backfill-sessions',
  description: 'Scan and warm session metadata from local storage',
  isHidden: true,
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
}
