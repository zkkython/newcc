import {
  getLastAPIRequest,
  getLastAPIRequestMessages,
  getLastClassifierRequests,
} from '../../bootstrap/state.js'

const call = async () => {
  const request = getLastAPIRequest()
  const messages = getLastAPIRequestMessages()
  const classifier = getLastClassifierRequests()

  const payload = {
    hasLastApiRequest: Boolean(request),
    lastApiRequest: request ?? null,
    messageCount: Array.isArray(messages) ? messages.length : 0,
    hasClassifierRequests: Array.isArray(classifier) && classifier.length > 0,
    classifierRequestCount: Array.isArray(classifier) ? classifier.length : 0,
  }

  return {
    type: 'text',
    value: JSON.stringify(payload, null, 2),
  }
}

export default {
  type: 'local',
  name: 'debug-tool-call',
  description: 'Show debug snapshot of latest API/tool-call state',
  isHidden: true,
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
}
