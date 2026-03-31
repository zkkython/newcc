import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { jsonStringify } from '../../utils/slowOperations.js'

export const TUNGSTEN_TOOL_NAME = 'Tungsten'

const inputSchema = lazySchema(() =>
  z.strictObject({
    command: z.string().min(1),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    status: z.enum(['unsupported']),
    message: z.string(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
type Output = z.infer<OutputSchema>

export const TungstenTool = buildTool({
  name: TUNGSTEN_TOOL_NAME,
  async description() {
    return 'Run commands in the Tungsten terminal backend (recovery build fallback).'
  },
  async prompt() {
    return 'Tungsten is unavailable in this reconstruction build.'
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  renderToolUseMessage(input) {
    return `Tungsten: ${input.command ?? ''}`
  },
  renderToolResultMessage(output: Output) {
    return output.message
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    return {
      type: 'tool_result',
      tool_use_id: toolUseID,
      content: jsonStringify(output),
      is_error: true,
    }
  },
  async call() {
    return {
      data: {
        status: 'unsupported' as const,
        message: 'Tungsten backend is not available in this build.',
      },
    }
  },
} satisfies ToolDef<InputSchema, Output>)
