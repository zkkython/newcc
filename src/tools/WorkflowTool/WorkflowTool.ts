import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { jsonStringify } from '../../utils/slowOperations.js'
import { getBundledWorkflows } from './bundled/index.js'
import { WORKFLOW_TOOL_NAME } from './constants.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    workflow_name: z
      .string()
      .min(1)
      .describe('Workflow command name to execute'),
    args: z.array(z.string()).optional().describe('Optional workflow arguments'),
    run_in_background: z
      .boolean()
      .optional()
      .describe('Whether this workflow should run as a background task'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>
type Input = z.infer<InputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    workflow_name: z.string(),
    status: z.enum(['ok', 'not_found']),
    message: z.string(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
type Output = z.infer<OutputSchema>

const PROMPT = `Run a named workflow script. Use this tool only for workflow-style orchestrations that are explicitly available in the current Claude Code environment.`

export const WorkflowTool = buildTool({
  name: WORKFLOW_TOOL_NAME,
  searchHint: 'run a named multi-step workflow',
  maxResultSizeChars: 100_000,
  shouldDefer: true,
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  isReadOnly() {
    return false
  },
  isConcurrencySafe() {
    return true
  },
  toAutoClassifierInput(input: Input) {
    return `workflow:${input.workflow_name}`
  },
  async description() {
    return PROMPT
  },
  async prompt() {
    return PROMPT
  },
  async call(input: Input) {
    const workflow = getBundledWorkflows().find(w => w.name === input.workflow_name)
    if (!workflow) {
      return {
        data: {
          workflow_name: input.workflow_name,
          status: 'not_found',
          message: `Workflow "${input.workflow_name}" is not registered in this reconstructed build.`,
        },
      }
    }

    return {
      data: {
        workflow_name: input.workflow_name,
        status: 'ok',
        message: `Workflow "${input.workflow_name}" is available for invocation.`,
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
    return `Workflow(${input.workflow_name ?? 'unknown'})`
  },
  renderToolResultMessage(content: Output) {
    return content.message
  },
} satisfies ToolDef<InputSchema, Output>)
