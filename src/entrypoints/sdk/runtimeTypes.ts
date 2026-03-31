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

export type Options = Record<string, unknown>

export type InternalOptions = Options & {
  includeInternalMetadata?: boolean
}

export type Query = AsyncIterable<SDKMessage>

export type InternalQuery = AsyncIterable<SDKMessage>

export type SessionMutationOptions = {
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
}

export type GetSessionInfoOptions = {
  dir?: string
}

export type GetSessionMessagesOptions = {
  dir?: string
  limit?: number
  offset?: number
  includeSystemMessages?: boolean
}

export type ForkSessionOptions = {
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
