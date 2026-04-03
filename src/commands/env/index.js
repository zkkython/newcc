import { getSessionId } from '../../bootstrap/state.js'
import { getCwd } from '../../utils/cwd.js'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'
import {
  getAuthTokenSource,
  isAnthropicAuthEnabled,
  isClaudeAISubscriber,
} from '../../utils/auth.js'
import { getTranscriptPath } from '../../utils/sessionStorage.js'

const call = async () => {
  const payload = {
    sessionId: getSessionId(),
    cwd: getCwd(),
    claudeConfigDir: getClaudeConfigHomeDir(),
    transcriptPath: getTranscriptPath(),
    userType: process.env.USER_TYPE ?? 'external',
    auth: {
      anthropicAuthEnabled: isAnthropicAuthEnabled(),
      tokenSource: getAuthTokenSource() ?? 'none',
      claudeAiSubscriber: isClaudeAISubscriber(),
    },
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
    },
  }
  return {
    type: 'text',
    value: JSON.stringify(payload, null, 2),
  }
}

export default {
  type: 'local',
  name: 'env',
  description: 'Inspect internal environment diagnostics',
  isHidden: true,
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
}
