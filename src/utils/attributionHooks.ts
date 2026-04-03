import { getCwd } from './cwd.js'
import { logForDebugging } from './debug.js'
import { findCanonicalGitRoot } from './git.js'
import { installPrepareCommitMsgHook } from './postCommitAttribution.js'

const fileContentCache = new Map<string, string>()

export function registerAttributionHooks(): void {
  const repoRoot = findCanonicalGitRoot(getCwd())
  if (!repoRoot) return
  void installPrepareCommitMsgHook(repoRoot).catch(error => {
    logForDebugging(
      `[attributionHooks] failed to install prepare-commit-msg hook: ${String(error)}`,
      { level: 'error' },
    )
  })
}

export function sweepFileContentCache(): void {
  fileContentCache.clear()
}

export function clearAttributionCaches(): void {
  fileContentCache.clear()
}
