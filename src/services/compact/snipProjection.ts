import type { Message } from '../../types/message.js'

export function isSnipBoundaryMessage(message: Message | undefined): boolean {
  return Boolean(message && message.type === 'system' && (message as any).subtype === 'snip_boundary')
}

export function projectSnippedView(messages: Message[]): Message[] {
  return messages.filter(m => !(m.type === 'system' && (m as any).subtype === 'snip_marker'))
}
