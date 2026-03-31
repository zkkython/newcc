import React from 'react'
import { Text } from '../../ink.js'
import { Select } from '../CustomSelect/index.js'
import { Dialog } from '../design-system/Dialog.js'
import type { AgentMemoryScope } from '../../tools/AgentTool/agentMemory.js'

type SnapshotUpdateDialogProps = {
  agentType: string
  scope: AgentMemoryScope
  snapshotTimestamp: string
  onComplete: (decision: 'merge' | 'keep' | 'replace') => void
  onCancel: () => void
}

export function SnapshotUpdateDialog({
  agentType,
  scope,
  snapshotTimestamp,
  onComplete,
  onCancel,
}: SnapshotUpdateDialogProps): React.ReactNode {
  return (
    <Dialog title="Agent Snapshot Update" onCancel={onCancel} color="warning">
      <Text>
        Agent <Text bold>{agentType}</Text> has a newer snapshot (
        {snapshotTimestamp}).
      </Text>
      <Text dimColor>Scope: {scope}</Text>
      <Select
        options={[
          { label: 'Merge snapshot and local changes', value: 'merge' },
          { label: 'Keep current local snapshot', value: 'keep' },
          { label: 'Replace with remote snapshot', value: 'replace' },
        ]}
        onChange={value => onComplete(value as 'merge' | 'keep' | 'replace')}
      />
    </Dialog>
  )
}
