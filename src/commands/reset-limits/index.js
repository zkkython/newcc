import { clearMockHeaders, getMockStatus } from '../../services/mockRateLimits.js'

const call = async () => {
  clearMockHeaders()
  return {
    type: 'text',
    value: `Rate-limit mocks cleared.\n\n${getMockStatus()}`,
  }
}

const resetLimitsCommand = {
  type: 'local',
  name: 'reset-limits',
  description: 'Reset local mocked rate-limit state',
  isHidden: true,
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
}

export default resetLimitsCommand
export const resetLimits = resetLimitsCommand
export const resetLimitsNonInteractive = resetLimitsCommand
