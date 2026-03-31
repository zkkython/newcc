import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '../services/analytics/index.js'
import type { MemoryHeader } from './memoryScan.js'

type MemoryScope = 'private' | 'project' | 'team'

export function logMemoryWriteShape(
  toolName: string,
  _toolInput: unknown,
  filePath: string,
  scope: MemoryScope,
): void {
  logEvent('tengu_memory_shape_write', {
    tool: toolName as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    scope: scope as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    path_kind: normalizePathKind(filePath) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  })
}

export function logMemoryRecallShape(
  candidates: MemoryHeader[],
  selected: MemoryHeader[],
): void {
  logEvent('tengu_memory_shape_recall', {
    candidate_count: String(candidates.length) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    selected_count: String(selected.length) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  })
}

function normalizePathKind(filePath: string): 'memory_md' | 'other' {
  return filePath.toLowerCase().endsWith('memory.md') ? 'memory_md' : 'other'
}
