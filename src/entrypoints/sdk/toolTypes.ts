export type SDKToolInput = Record<string, unknown>

export type SDKToolResult = {
  content?: string
  is_error?: boolean
  [key: string]: unknown
}

export type SDKToolDefinition = {
  name: string
  description?: string
  input_schema?: Record<string, unknown>
  output_schema?: Record<string, unknown>
  is_enabled?: boolean
}
