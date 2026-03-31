import * as React from 'react'
import type { DeepImmutable } from 'src/types/utils.js'
import type { CommandResultDisplay } from '../../commands.js'
import { Box, Text } from '../../ink.js'
import type { LocalWorkflowTaskState } from '../../tasks/LocalWorkflowTask/LocalWorkflowTask.js'
import { Dialog } from '../design-system/Dialog.js'

type Props = {
  workflow: DeepImmutable<LocalWorkflowTaskState>
  onDone: (result?: string, options?: { display?: CommandResultDisplay }) => void
  onBack?: () => void
  onKill?: () => void
  onSkipAgent?: (agentId: string) => void
  onRetryAgent?: (agentId: string) => void
}

export function WorkflowDetailDialog({
  workflow,
  onDone,
  onBack,
  onKill,
  onSkipAgent,
  onRetryAgent,
}: Props): React.ReactNode {
  const firstPending = workflow.agents.find(
    a => a.status === 'pending' || a.status === 'running',
  )
  const firstFailed = workflow.agents.find(a => a.status === 'failed')

  const hintParts: string[] = []
  if (onBack) hintParts.push('Left: back')
  hintParts.push('Esc/Enter: close')
  if (workflow.status === 'running' && onKill) hintParts.push('x: stop')
  if (workflow.status === 'running' && firstPending && onSkipAgent) {
    hintParts.push('s: skip current')
  }
  if (workflow.status === 'running' && firstFailed && onRetryAgent) {
    hintParts.push('r: retry failed')
  }

  return React.createElement(
    Box,
    {
      flexDirection: 'column',
      onKeyDown: (e: { key: string; preventDefault: () => void }) => {
        if (e.key === 'escape' || e.key === 'enter' || e.key === ' ') {
          e.preventDefault()
          onDone('Workflow details dismissed', { display: 'system' })
          return
        }
        if (e.key === 'left' && onBack) {
          e.preventDefault()
          onBack()
          return
        }
        if (e.key === 'x' && workflow.status === 'running' && onKill) {
          e.preventDefault()
          onKill()
          return
        }
        if (
          e.key === 's' &&
          workflow.status === 'running' &&
          firstPending &&
          onSkipAgent
        ) {
          e.preventDefault()
          onSkipAgent(firstPending.id)
          return
        }
        if (
          e.key === 'r' &&
          workflow.status === 'running' &&
          firstFailed &&
          onRetryAgent
        ) {
          e.preventDefault()
          onRetryAgent(firstFailed.id)
        }
      },
    },
    React.createElement(
      Dialog,
      {
        title: workflow.workflowName ?? 'Workflow',
        subtitle: workflow.summary ?? workflow.description,
        onCancel: () =>
          onDone('Workflow details dismissed', { display: 'system' }),
        color: 'background',
      },
      React.createElement(
        Box,
        { flexDirection: 'column' },
        React.createElement(
          Text,
          null,
          `Status: ${workflow.status} | Agents: ${workflow.agentCount} | Completed: ${workflow.completedAgents} | Failed: ${workflow.failedAgents} | Skipped: ${workflow.skippedAgents}`,
        ),
        React.createElement(
          Text,
          { dimColor: true },
          `Hints: ${hintParts.join(' · ')}`,
        ),
      ),
    ),
  )
}
