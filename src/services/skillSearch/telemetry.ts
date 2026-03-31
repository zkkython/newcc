import { logForDebugging } from '../../utils/debug.js'

export function logRemoteSkillLoaded(payload: {
  slug: string
  cacheHit: boolean
  latencyMs: number
  urlScheme?: 'gs' | 'http' | 'https' | 's3'
  fileCount?: number
  totalBytes?: number
  fetchMethod?: string
  error?: string
}): void {
  const base = `[skillSearch] slug=${payload.slug} cacheHit=${payload.cacheHit} latency=${payload.latencyMs}ms`
  const suffix = payload.error ? ` error=${payload.error}` : ''
  logForDebugging(base + suffix)
}
