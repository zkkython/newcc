import type { ToolUseContext } from '../../Tool.js'
import type { DiscoverySignal } from './signals.js'
import { isSkillSearchEnabled } from './featureCheck.js'

type SkillDiscoveryAttachment = {
  type: 'skill_discovery'
  skills: { name: string; description: string; shortId?: string }[]
  signal: DiscoverySignal
  source: 'native' | 'aki' | 'both'
}

export type SkillDiscoveryPrefetchHandle = {
  promise: Promise<SkillDiscoveryAttachment[]>
  startedAt: number
}

function emptySkillDiscovery(
  signal: DiscoverySignal,
): SkillDiscoveryAttachment[] {
  return [
    {
      type: 'skill_discovery',
      skills: [],
      signal,
      source: 'native',
    },
  ]
}

export async function getTurnZeroSkillDiscovery(
  _input: string,
  _messages: unknown[],
  _context: ToolUseContext,
): Promise<SkillDiscoveryAttachment[]> {
  if (!isSkillSearchEnabled()) return []
  return emptySkillDiscovery('turn_zero')
}

export function startSkillDiscoveryPrefetch(
  _input: string | null,
  _messages: unknown[],
  _toolUseContext: ToolUseContext,
): SkillDiscoveryPrefetchHandle | null {
  if (!isSkillSearchEnabled()) return null
  return {
    startedAt: Date.now(),
    promise: Promise.resolve(emptySkillDiscovery('turn_iteration')),
  }
}

export async function collectSkillDiscoveryPrefetch(
  handle: SkillDiscoveryPrefetchHandle | null,
): Promise<SkillDiscoveryAttachment[]> {
  if (!handle) return []
  return handle.promise
}
