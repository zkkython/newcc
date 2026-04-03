import type { CacheSafeParams } from './forkedAgent.js'
import { updateSessionActivity } from './concurrentSessions.js'

const TASK_SUMMARY_INTERVAL_MS = 30_000
let lastSummaryAt = 0

export function shouldGenerateTaskSummary(): boolean {
  return Date.now() - lastSummaryAt >= TASK_SUMMARY_INTERVAL_MS
}

export function maybeGenerateTaskSummary(_params: CacheSafeParams): void {
  const waitingFor = deriveTaskSummary(_params)
  void updateSessionActivity({
    status: 'busy',
    waitingFor,
  })
  lastSummaryAt = Date.now()
}

function deriveTaskSummary(params: CacheSafeParams): string {
  const msgs = params.forkContextMessages
  for (let i = msgs.length - 1; i >= 0; i -= 1) {
    const m = msgs[i] as unknown as Record<string, unknown>
    const preview = messagePreview(m)
    if (preview) return preview
  }
  return 'processing'
}

function messagePreview(m: Record<string, unknown>): string | null {
  if (typeof m.type === 'string') {
    if (m.type === 'tool_use' && typeof m.name === 'string') {
      return `running ${truncate(m.name, 80)}`
    }
    if (m.type === 'tool_result') {
      return 'processing tool result'
    }
  }
  if (typeof m.message === 'string' && m.message.trim().length > 0) {
    return truncate(m.message.trim(), 120)
  }
  if (typeof m.content === 'string' && m.content.trim().length > 0) {
    return truncate(m.content.trim(), 120)
  }
  if (Array.isArray(m.content)) {
    for (const block of m.content) {
      if (!block || typeof block !== 'object') continue
      const rec = block as Record<string, unknown>
      if (typeof rec.text === 'string' && rec.text.trim().length > 0) {
        return truncate(rec.text.trim(), 120)
      }
    }
  }
  return null
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value
  return `${value.slice(0, Math.max(0, max - 1))}…`
}
