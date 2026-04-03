import {
  getMockStatus,
  setMockRateLimitScenario,
} from '../../services/mockRateLimits.js'

const ALLOWED_SCENARIOS = new Set([
  'normal',
  'session-limit-reached',
  'approaching-weekly-limit',
  'weekly-limit-reached',
  'overage-active',
  'overage-warning',
  'overage-exhausted',
  'out-of-credits',
  'org-zero-credit-limit',
  'org-spend-cap-hit',
  'member-zero-credit-limit',
  'seat-tier-zero-credit-limit',
  'opus-limit',
  'opus-warning',
  'sonnet-limit',
  'sonnet-warning',
  'fast-mode-limit',
  'fast-mode-short-limit',
  'extra-usage-required',
  'clear',
])

const call = async args => {
  const scenario = args.trim()
  if (!scenario) {
    return {
      type: 'text',
      value: `Usage: /mock-limits <scenario>\n\n${getMockStatus()}`,
    }
  }
  if (!ALLOWED_SCENARIOS.has(scenario)) {
    return {
      type: 'text',
      value: `Unknown scenario: ${scenario}\nAllowed: ${[...ALLOWED_SCENARIOS].join(', ')}`,
    }
  }

  setMockRateLimitScenario(scenario)
  return {
    type: 'text',
    value: `Applied mock-limits scenario: ${scenario}\n\n${getMockStatus()}`,
  }
}

export default {
  type: 'local',
  name: 'mock-limits',
  description: 'Mock rate-limit state for testing',
  isHidden: true,
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
}
