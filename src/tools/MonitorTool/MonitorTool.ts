import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import type { TaskStateBase } from '../../Task.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { jsonStringify } from '../../utils/slowOperations.js'
import { getTaskOutput } from '../../utils/task/diskOutput.js'

const MONITOR_TOOL_NAME = 'Monitor'
const DEFAULT_MAX_LINES = 80

const inputSchema = lazySchema(() =>
  z.strictObject({
    task_id: z
      .string()
      .min(1)
      .describe('Background task ID to monitor (for example bxxxx or wxxxx)'),
    max_lines: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe('Number of output lines to include from the task tail'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>
type Input = z.infer<InputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    task_id: z.string(),
    status: z.string(),
    message: z.string(),
    output: z.string(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
type Output = z.infer<OutputSchema>

function tailLines(text: string, maxLines: number): string {
  if (!text) return ''
  const lines = text.split(/\r?\n/)
  return lines.slice(-maxLines).join('\n')
}

export const MonitorTool = buildTool({
  name: MONITOR_TOOL_NAME,
  searchHint: 'read output from a running background task',
  maxResultSizeChars: 200_000,
  shouldDefer: true,
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  isReadOnly() {
    return true
  },
  isConcurrencySafe() {
    return true
  },
  toAutoClassifierInput(input: Input) {
    return `monitor:${input.task_id}`
  },
  async description() {
    return 'Read recent output and status from a background task.'
  },
  async prompt() {
    return 'Use this tool to inspect output from a background task by task_id.'
  },
  async validateInput(input, context) {
    const task = context.getAppState().tasks[input.task_id] as
      | TaskStateBase
      | undefined
    if (!task) {
      return {
        result: false,
        message: `No task found with ID: ${input.task_id}`,
        errorCode: 1,
      }
    }
    return { result: true }
  },
  async call(input, context) {
    const task = context.getAppState().tasks[input.task_id] as
      | TaskStateBase
      | undefined
    if (!task) {
      throw new Error(`No task found with ID: ${input.task_id}`)
    }

    const rawOutput = await getTaskOutput(input.task_id, 256 * 1024)
    const output = tailLines(rawOutput, input.max_lines ?? DEFAULT_MAX_LINES)
    const message =
      output.length > 0
        ? `Read output for task ${input.task_id} (${task.status}).`
        : `Task ${input.task_id} has no output yet (${task.status}).`

    return {
      data: {
        task_id: input.task_id,
        status: task.status,
        message,
        output,
      },
    }
  },
  mapToolResultToToolResultBlockParam(content: Output, toolUseID: string) {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: jsonStringify(content),
    }
  },
  renderToolUseMessage(input: Partial<Input>) {
    return `Monitor(${input.task_id ?? 'unknown'})`
  },
  renderToolResultMessage(content: Output) {
    return content.message
  },
} satisfies ToolDef<InputSchema, Output>)
