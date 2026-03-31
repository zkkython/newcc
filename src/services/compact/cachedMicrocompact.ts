import { getCachedMCConfig } from './cachedMCConfig.js'

export type CacheEditsBlock = {
  type: 'cache_edits'
  removedToolUseIds?: string[]
  deletedToolIds?: string[]
  baselineCacheDeletedTokens?: number
}

export type PinnedCacheEdits = {
  userMessageIndex: number
  block: CacheEditsBlock
}

export type CachedMCState = {
  pinnedEdits: PinnedCacheEdits[]
  toolsSentToAPI: Set<string>
}

export function createCachedMCState(): CachedMCState {
  return {
    pinnedEdits: [],
    toolsSentToAPI: new Set<string>(),
  }
}

export function markToolsSentToAPI(state: CachedMCState): void {
  state.toolsSentToAPI.clear()
}

export function resetCachedMCState(state: CachedMCState): void {
  state.pinnedEdits = []
  state.toolsSentToAPI.clear()
}

export function isCachedMicrocompactEnabled(): boolean {
  return getCachedMCConfig().enabled
}

export function isModelSupportedForCacheEditing(model: string): boolean {
  return getCachedMCConfig().supportedModels.includes(model)
}

export { getCachedMCConfig }
