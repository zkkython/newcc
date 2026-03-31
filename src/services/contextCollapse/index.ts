import type { Message } from '../../types/message.js'

type Health = {
  totalErrors: number
  totalEmptySpawns: number
  totalSpawns: number
  emptySpawnWarningEmitted: boolean
  lastError?: string
}

type CollapseStats = {
  collapsedSpans: number
  stagedSpans: number
  collapsedMessages: number
  health: Health
}

type Store = {
  enabled: boolean
  stats: CollapseStats
}

const listeners = new Set<() => void>()
const store: Store = {
  enabled: true,
  stats: {
    collapsedSpans: 0,
    stagedSpans: 0,
    collapsedMessages: 0,
    health: {
      totalErrors: 0,
      totalEmptySpawns: 0,
      totalSpawns: 0,
      emptySpawnWarningEmitted: false,
    },
  },
}

function emit(): void {
  for (const l of listeners) l()
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function initContextCollapse(): void {
  store.enabled = true
  emit()
}

export function isContextCollapseEnabled(): boolean {
  return store.enabled
}

export function getStats(): CollapseStats {
  return {
    ...store.stats,
    health: { ...store.stats.health },
  }
}

export function resetContextCollapse(): void {
  store.stats = {
    collapsedSpans: 0,
    stagedSpans: 0,
    collapsedMessages: 0,
    health: {
      totalErrors: 0,
      totalEmptySpawns: 0,
      totalSpawns: 0,
      emptySpawnWarningEmitted: false,
    },
  }
  emit()
}

export async function applyCollapsesIfNeeded(
  messages: Message[],
  _toolUseContext?: unknown,
  _querySource?: string,
): Promise<{ messages: Message[] }> {
  return { messages }
}

export function recoverFromOverflow(
  messages: Message[],
  _querySource?: string,
): { messages: Message[]; committed: number } {
  return { messages, committed: 0 }
}

export function isWithheldPromptTooLong(msg: Message | undefined): boolean {
  if (!msg || msg.type !== 'assistant') return false
  const m = msg as Record<string, unknown>
  if (m.apiError === 'prompt_too_long') return true
  const text = String(m.message ?? m.content ?? '')
  return /prompt.+too.+long/i.test(text)
}

export function __setStatsFromRestore(next: Partial<CollapseStats>): void {
  store.stats = {
    ...store.stats,
    ...next,
    health: {
      ...store.stats.health,
      ...(next.health ?? {}),
    },
  }
  emit()
}
