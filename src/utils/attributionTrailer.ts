import type { AttributionData, AttributionState } from './commitAttribution.js'

export function buildPRTrailers(
  attributionData: AttributionData,
  attributionState: AttributionState,
): string[] {
  const claudePercent = attributionData.summary.claudePercent
  const promptCount = attributionState.promptCount
  return [
    `Claude-Code-Attribution: ${claudePercent}%`,
    `Claude-Code-Prompts: ${promptCount}`,
  ]
}
