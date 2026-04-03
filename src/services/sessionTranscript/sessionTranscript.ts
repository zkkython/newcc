import { appendFile, mkdir } from 'fs/promises'
import { join } from 'path'
import type { Message } from '../../types/message.js'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'

/**
 * Lightweight local transcript archival used by Kairos-gated call sites.
 * Appends compact snapshots to ~/.claude/kairos/transcripts/YYYY-MM-DD.jsonl.
 */
export async function writeSessionTranscriptSegment(
  messages: readonly Message[],
): Promise<void> {
  await appendTranscriptSegment(messages, new Date().toISOString().slice(0, 10))
}

export function flushOnDateChange(
  messages: readonly Message[],
  currentDate: string,
): void {
  void appendTranscriptSegment(messages, currentDate)
}

const lastSignatureByDate = new Map<string, string>()

async function appendTranscriptSegment(
  messages: readonly Message[],
  currentDate: string,
): Promise<void> {
  if (messages.length === 0) return

  const tail = messages.slice(Math.max(0, messages.length - 20))
  const signature = `${messages.length}:${messageId(tail.at(-1)) ?? 'unknown'}:${messageType(tail.at(-1))}`
  if (lastSignatureByDate.get(currentDate) === signature) {
    return
  }
  lastSignatureByDate.set(currentDate, signature)

  const root = join(getClaudeConfigHomeDir(), 'kairos', 'transcripts')
  await mkdir(root, { recursive: true })
  const path = join(root, `${currentDate}.jsonl`)
  const payload = {
    at: new Date().toISOString(),
    count: messages.length,
    tail: tail.map(m => ({
      id: messageId(m),
      type: messageType(m),
      text: messageTextPreview(m),
    })),
  }
  await appendFile(path, `${JSON.stringify(payload)}\n`, 'utf8')
}

function messageId(msg: unknown): string | undefined {
  if (!msg || typeof msg !== 'object') return undefined
  const rec = msg as Record<string, unknown>
  if (typeof rec.uuid === 'string') return rec.uuid
  if (typeof rec.id === 'string') return rec.id
  return undefined
}

function messageType(msg: unknown): string {
  if (!msg || typeof msg !== 'object') return 'unknown'
  const rec = msg as Record<string, unknown>
  return typeof rec.type === 'string' ? rec.type : 'unknown'
}

function messageTextPreview(msg: unknown): string {
  if (!msg || typeof msg !== 'object') return ''
  const rec = msg as Record<string, unknown>
  if (typeof rec.message === 'string') {
    return rec.message.slice(0, 200)
  }
  if (typeof rec.content === 'string') {
    return rec.content.slice(0, 200)
  }
  return ''
}
