import * as React from 'react'
import type { DeepImmutable } from 'src/types/utils.js'
import { Box, Text } from '../../ink.js'
import type { MonitorMcpTaskState } from '../../tasks/MonitorMcpTask/MonitorMcpTask.js'
import { Dialog } from '../design-system/Dialog.js'

type Props = {
  task: DeepImmutable<MonitorMcpTaskState>
  onBack?: () => void
  onKill?: () => void
}

export function MonitorMcpDetailDialog({
  task,
  onBack,
  onKill,
}: Props): React.ReactNode {
  return React.createElement(
    Box,
    {
      flexDirection: 'column',
      onKeyDown: (e: { key: string; preventDefault: () => void }) => {
        if (e.key === 'left' && onBack) {
          e.preventDefault()
          onBack()
          return
        }
        if (e.key === 'x' && task.status === 'running' && onKill) {
          e.preventDefault()
          onKill()
        }
      },
    },
    React.createElement(
      Dialog,
      {
        title: 'Monitor details',
        subtitle: task.summary ?? task.description,
        onCancel: () => onBack?.(),
        color: 'background',
      },
      React.createElement(
        Box,
        { flexDirection: 'column' },
        React.createElement(Text, null, `Status: ${task.status}`),
        React.createElement(
          Text,
          { dimColor: true },
          task.command ? `Command: ${task.command}` : 'No command metadata',
        ),
      ),
    ),
  )
}
