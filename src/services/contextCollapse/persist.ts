import { __setStatsFromRestore } from './index.js'

type CommitEntry = {
  summaryUuid?: string
  firstArchivedUuid?: string
  lastArchivedUuid?: string
}

type SnapshotEntry = {
  staged?: Array<unknown>
}

export function restoreFromEntries(
  commits: CommitEntry[],
  snapshot?: SnapshotEntry,
): void {
  __setStatsFromRestore({
    collapsedSpans: commits.length,
    collapsedMessages: commits.length,
    stagedSpans: snapshot?.staged?.length ?? 0,
  })
}
