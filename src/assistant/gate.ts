import { getFeatureValue_CACHED_MAY_BE_STALE } from '../services/analytics/growthbook.js'

export async function isKairosEnabled(): Promise<boolean> {
  if (process.env.CLAUDE_CODE_FORCE_ASSISTANT === '1') {
    return true
  }

  try {
    return Boolean(getFeatureValue_CACHED_MAY_BE_STALE('tengu_kairos', false))
  } catch {
    return false
  }
}
