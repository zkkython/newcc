// Reconstructed core message model.
// This keeps type contracts available for recovery builds while preserving
// compatibility with existing call sites.

export type MessageOrigin = 'user' | 'assistant' | 'system' | 'tool' | string

export type BaseMessage = {
  uuid?: string
  type?: string
  role?: string
  subtype?: string
  timestamp?: string | number
  origin?: MessageOrigin
  [key: string]: unknown
}

export type UserMessage = BaseMessage & {
  role?: 'user'
  content?: unknown
}

export type AssistantMessage = BaseMessage & {
  role?: 'assistant'
  content?: unknown
}

export type SystemMessage = BaseMessage & {
  role?: 'system'
  message?: string
}

export type AttachmentMessage = BaseMessage & {
  attachments?: unknown[]
}

export type ProgressMessage = BaseMessage & {
  progress?: unknown
}

export type HookResultMessage = BaseMessage & {
  hookEventName?: string
  hookResult?: unknown
}

export type SystemAPIErrorMessage = SystemMessage & {
  error?: string
}

export type SystemBridgeStatusMessage = SystemMessage & {
  bridgeStatus?: string
}

export type SystemInformationalMessage = SystemMessage & {
  info?: string
}

export type SystemMemorySavedMessage = SystemMessage & {
  memoryPath?: string
}

export type SystemStopHookSummaryMessage = SystemMessage & {
  summary?: string
}

export type SystemThinkingMessage = SystemMessage & {
  thinking?: string
}

export type SystemTurnDurationMessage = SystemMessage & {
  durationMs?: number
}

export type GroupedToolUseMessage = AssistantMessage & {
  toolUses?: unknown[]
}

export type CollapsedReadSearchGroup = {
  id?: string
  label?: string
  items?: unknown[]
}

export type PartialCompactDirection = 'older' | 'newer' | 'both' | string

export type Message =
  | UserMessage
  | AssistantMessage
  | SystemMessage
  | AttachmentMessage
  | ProgressMessage
  | HookResultMessage

export type RenderableMessage = Message
export type NormalizedMessage = Message
export type NormalizedUserMessage = UserMessage
export type NormalizedAssistantMessage = AssistantMessage
