import type { Message } from '../../types/message.js'

export const SNIP_NUDGE_TEXT =
  'To reduce context load, you may summarize old resolved sections when appropriate.'

export function isSnipRuntimeEnabled(): boolean {
  return process.env.CLAUDE_CODE_DISABLE_SNIP !== '1'
}

export function isSnipMarkerMessage(message: Message | undefined): boolean {
  return Boolean(message && message.type === 'system' && (message as any).subtype === 'snip_marker')
}

export function snipCompactIfNeeded(
  messages: Message[],
  _options?: { force?: boolean },
): {
  messages: Message[]
  tokensFreed: number
  boundaryMessage?: Message
} {
  return { messages, tokensFreed: 0 }
}
