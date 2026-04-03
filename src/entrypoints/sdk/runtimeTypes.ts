import type { ZodRawShape } from 'zod/v4'
import type {
  SDKMessage,
  SDKResultMessage,
  SDKSessionInfo,
} from './coreTypes.js'

export type EffortLevel = 'low' | 'medium' | 'high' | 'max'

export type AnyZodRawShape = ZodRawShape

export type InferShape<Schema extends AnyZodRawShape> = {
  [K in keyof Schema]: unknown
}

export type SdkMcpToolDefinition<Schema extends AnyZodRawShape> = {
  name: string
  description: string
  inputSchema: Schema
  handler: (args: InferShape<Schema>, extra: unknown) => Promise<unknown>
  extras?: {
    annotations?: unknown
    searchHint?: string
    alwaysLoad?: boolean
  }
}

export type McpSdkServerConfigWithInstance = {
  type: 'sdk'
  name: string
  instance?: unknown
}

export type Options = {
  cwd?: string
  model?: string
  fallbackModel?: string
  systemPrompt?: string
  appendSystemPrompt?: string
  maxTurns?: number
  maxBudgetUsd?: number
  taskBudget?: { total: number }
  replayUserMessages?: boolean
  includePartialMessages?: boolean
  verbose?: boolean
  jsonSchema?: Record<string, unknown>
  // Internal/runtime-injected objects. Kept as unknown[] here to avoid
  // pulling large runtime types into the lightweight SDK type surface.
  commands?: unknown[]
  tools?: unknown[]
  mcpClients?: unknown[]
  canUseTool?: (...args: unknown[]) => Promise<unknown>
  [key: string]: unknown
}

export type InternalOptions = Options & {
  includeInternalMetadata?: boolean
}

export type Query = AsyncIterable<SDKMessage>

export type InternalQuery = AsyncIterable<SDKMessage>

export type SessionMutationOptions = {
  dir?: string
  timeoutMs?: number
  signal?: AbortSignal
}

export type SDKSessionOptions = {
  options?: Options
}

export type ListSessionsOptions = {
  dir?: string
  limit?: number
  offset?: number
  timeoutMs?: number
  signal?: AbortSignal
}

export type GetSessionInfoOptions = {
  dir?: string
  timeoutMs?: number
  signal?: AbortSignal
}

export type GetSessionMessagesOptions = {
  dir?: string
  limit?: number
  offset?: number
  includeSystemMessages?: boolean
  timeoutMs?: number
  signal?: AbortSignal
}

export type ForkSessionOptions = {
  dir?: string
  upToMessageId?: string
  title?: string
  timeoutMs?: number
  signal?: AbortSignal
  // Back-compat for earlier reconstruction rounds that nested options.
  options?: Options
}

export type ForkSessionResult = {
  sessionId: string
}

export type SessionMessage = SDKMessage

export type SDKSession = {
  id: string
  query(params: { prompt: string }): Query
  prompt(message: string): Promise<SDKResultMessage>
  getInfo(options?: GetSessionInfoOptions): Promise<SDKSessionInfo | undefined>
  getMessages(options?: GetSessionMessagesOptions): Promise<SessionMessage[]>
  fork(options?: ForkSessionOptions): Promise<ForkSessionResult>
}
