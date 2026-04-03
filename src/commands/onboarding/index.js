import {
  getAuthTokenSource,
  getSubscriptionName,
  isAnthropicAuthEnabled,
  isClaudeAISubscriber,
} from '../../utils/auth.js'

const call = async () => {
  const authEnabled = isAnthropicAuthEnabled()
  const subscriber = isClaudeAISubscriber()
  const tokenSource = getAuthTokenSource() ?? 'none'
  const subscription = getSubscriptionName()

  const nextSteps = []
  if (!authEnabled) {
    nextSteps.push('Run `claude setup-token` or configure ANTHROPIC_API_KEY.')
  } else {
    nextSteps.push('Authentication is configured.')
  }
  if (!subscriber) {
    nextSteps.push('If you use claude.ai subscription features, run `claude login`.')
  }
  nextSteps.push('Run `claude doctor` to validate local install health.')
  nextSteps.push('Run `claude up` in project roots that provide CLAUDE.md setup.')

  const lines = [
    'Onboarding status (reconstructed)',
    '',
    `Auth enabled: ${authEnabled ? 'yes' : 'no'}`,
    `Token source: ${tokenSource}`,
    `Claude.ai subscriber: ${subscriber ? 'yes' : 'no'}`,
    `Subscription: ${subscription || 'unknown'}`,
    '',
    'Recommended next steps:',
    ...nextSteps.map((s, i) => `${i + 1}. ${s}`),
  ]

  return {
    type: 'text',
    value: lines.join('\n'),
  }
}

export default {
  type: 'local',
  name: 'onboarding',
  description: 'Show onboarding status and recommended setup actions',
  isHidden: true,
  supportsNonInteractive: false,
  load: () => Promise.resolve({ call }),
}
