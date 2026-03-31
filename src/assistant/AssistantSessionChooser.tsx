import React from 'react'
import { Box, Text } from '../ink.js'
import { Select } from '../components/CustomSelect/index.js'
import { Dialog } from '../components/design-system/Dialog.js'
import type { AssistantSession } from './sessionDiscovery.js'

type Props = {
  sessions: AssistantSession[]
  onSelect: (sessionId: string) => void
  onCancel: () => void
}

export function AssistantSessionChooser({
  sessions,
  onSelect,
  onCancel,
}: Props): React.ReactNode {
  const options = sessions.map(s => ({
    value: s.id,
    label: s.title,
    description: `${s.status} · ${s.id.slice(0, 8)}`,
  }))

  return (
    <Dialog title="Assistant Sessions" onCancel={onCancel}>
      <Box flexDirection="column" gap={1}>
        <Text dimColor>Select a running assistant session to attach.</Text>
        <Select options={options} onChange={value => onSelect(String(value))} />
      </Box>
    </Dialog>
  )
}
