import type { CacheSafeParams } from './forkedAgent.js'

const TASK_SUMMARY_INTERVAL_MS = 30_000
let lastSummaryAt = 0

export function shouldGenerateTaskSummary(): boolean {
  return Date.now() - lastSummaryAt >= TASK_SUMMARY_INTERVAL_MS
}

export function maybeGenerateTaskSummary(_params: CacheSafeParams): void {
  // Reconstructed baseline: keep scheduler behavior without injecting extra
  // model turns until full bg-session summary pipeline is restored.
  lastSummaryAt = Date.now()
}
