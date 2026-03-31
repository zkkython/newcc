import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { jsonStringify } from '../../utils/slowOperations.js'

export const OVERFLOW_TEST_TOOL_NAME = 'OverflowTest'

const inputSchema = lazySchema(() =>
  z.strictObject({
    repeat: z.number().int().min(1).max(200).optional(),
    text: z.string().optional(),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    content: z.string(),
    bytes: z.number(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
type Output = z.infer<OutputSchema>

export const OverflowTestTool = buildTool({
  name: OVERFLOW_TEST_TOOL_NAME,
  async description() {
    return 'Generate a deterministic long payload for transcript overflow testing.'
  },
  async prompt() {
    return 'Use this tool only for internal overflow testing.'
  },
  isReadOnly() {
    return true
  },
  isConcurrencySafe() {
    return true
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  renderToolUseMessage() {
    return 'Preparing overflow test payload'
  },
  renderToolResultMessage(output: Output) {
    return `Generated ${output.bytes} bytes`
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    return {
      type: 'tool_result',
      tool_use_id: toolUseID,
      content: jsonStringify(output),
    }
  },
  async call({ repeat = 16, text = 'overflow-test' }) {
    const parts = Array.from({ length: repeat }, (_, i) => `${i + 1}:${text}`)
    const content = parts.join('\n')
    return {
      data: {
        content,
        bytes: Buffer.byteLength(content, 'utf8'),
      },
    }
  },
} satisfies ToolDef<InputSchema, Output>)
