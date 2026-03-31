import type { SetAppState, Task, TaskStateBase } from '../../Task.js'
import { updateTaskState } from '../../utils/task/framework.js'

export type WorkflowAgentStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'

export type LocalWorkflowTaskAgentState = {
  id: string
  name?: string
  status: WorkflowAgentStatus
  error?: string
}

export type LocalWorkflowTaskState = TaskStateBase & {
  type: 'local_workflow'
  workflowName?: string
  summary?: string
  agentCount: number
  completedAgents: number
  failedAgents: number
  skippedAgents: number
  totalTokens: number
  totalToolUses: number
  lastToolName?: string
  abortController?: AbortController
  // Controllers for workflow-spawned agents; sessionHooks.ts references this pattern.
  agentControllers: Map<string, AbortController>
  agents: LocalWorkflowTaskAgentState[]
  error?: string
}

export function isLocalWorkflowTask(task: unknown): task is LocalWorkflowTaskState {
  return (
    typeof task === 'object' &&
    task !== null &&
    'type' in task &&
    task.type === 'local_workflow'
  )
}

export function killWorkflowTask(taskId: string, setAppState: SetAppState): void {
  updateTaskState<LocalWorkflowTaskState>(taskId, setAppState, task => {
    if (task.status !== 'running') return task
    task.abortController?.abort()
    for (const controller of task.agentControllers.values()) {
      controller.abort()
    }
    return {
      ...task,
      status: 'killed',
      endTime: Date.now(),
      notified: true,
      abortController: undefined,
      agentControllers: new Map(),
    }
  })
}

export function skipWorkflowAgent(
  taskId: string,
  agentId: string,
  setAppState: SetAppState,
): void {
  updateTaskState<LocalWorkflowTaskState>(taskId, setAppState, task => {
    if (task.status !== 'running') return task
    const idx = task.agents.findIndex(a => a.id === agentId)
    if (idx < 0) return task
    const curr = task.agents[idx]
    if (!curr || curr.status === 'completed' || curr.status === 'skipped') {
      return task
    }
    const agents = [...task.agents]
    agents[idx] = { ...curr, status: 'skipped', error: undefined }
    const skippedAgents = task.skippedAgents + 1
    return {
      ...task,
      agents,
      skippedAgents,
      summary: `Skipped agent ${curr.name ?? agentId}`,
    }
  })
}

export function retryWorkflowAgent(
  taskId: string,
  agentId: string,
  setAppState: SetAppState,
): void {
  updateTaskState<LocalWorkflowTaskState>(taskId, setAppState, task => {
    if (task.status !== 'running') return task
    const idx = task.agents.findIndex(a => a.id === agentId)
    if (idx < 0) return task
    const curr = task.agents[idx]
    if (!curr || (curr.status !== 'failed' && curr.status !== 'skipped')) {
      return task
    }
    const agents = [...task.agents]
    agents[idx] = { ...curr, status: 'pending', error: undefined }
    return {
      ...task,
      agents,
      failedAgents: curr.status === 'failed' ? Math.max(0, task.failedAgents - 1) : task.failedAgents,
      skippedAgents: curr.status === 'skipped' ? Math.max(0, task.skippedAgents - 1) : task.skippedAgents,
      summary: `Retrying agent ${curr.name ?? agentId}`,
    }
  })
}

export const LocalWorkflowTask: Task = {
  name: 'LocalWorkflowTask',
  type: 'local_workflow',
  async kill(taskId, setAppState) {
    killWorkflowTask(taskId, setAppState)
  },
}
