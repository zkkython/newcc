import type { Message } from '../../types/message.js'

type ReactiveCompactResult = {
  userDisplayMessage?: string
  summaryMessages: Message[]
  attachments: Message[]
  hookResults: Message[]
}

export function isReactiveCompactEnabled(): boolean {
  return false
}

export function isReactiveOnlyMode(): boolean {
  return false
}

export function isWithheldPromptTooLong(msg: Message | undefined): boolean {
  if (!msg || msg.type !== 'assistant') return false
  const m = msg as Record<string, unknown>
  if (m.apiError === 'prompt_too_long') return true
  return /prompt.+too.+long/i.test(String(m.message ?? m.content ?? ''))
}

export function isWithheldMediaSizeError(msg: Message | undefined): boolean {
  if (!msg || msg.type !== 'assistant') return false
  const text = String((msg as any).message ?? (msg as any).content ?? '')
  return /image|media|document.+too.+(large|big|size)/i.test(text)
}

export async function tryReactiveCompact(_args: {
  hasAttempted: boolean
  querySource: string
  aborted: boolean
  messages: Message[]
  cacheSafeParams: unknown
}): Promise<null | { messages: Message[]; result: ReactiveCompactResult }> {
  return null
}

export async function reactiveCompactOnPromptTooLong(
  _messages: Message[],
  _cacheSafeParams: unknown,
  _opts: { customInstructions?: string; trigger?: string },
): Promise<
  | { ok: true; result: ReactiveCompactResult }
  | {
      ok: false
      reason:
        | 'too_few_groups'
        | 'aborted'
        | 'exhausted'
        | 'error'
        | 'media_unstrippable'
    }
> {
  return { ok: false, reason: 'too_few_groups' }
}
