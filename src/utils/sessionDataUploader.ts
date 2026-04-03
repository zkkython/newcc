import { appendFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { getSessionId } from '../bootstrap/state.js'
import type { Message } from '../types/message.js'
import { getClaudeConfigHomeDir } from './envUtils.js'

export type SessionTurnUploader = (messages: Message[]) => Promise<void>

export async function createSessionTurnUploader(): Promise<SessionTurnUploader> {
  const root = join(getClaudeConfigHomeDir(), 'session-data')
  await mkdir(root, { recursive: true })
  let lastSignature = ''

  return async (messages: Message[]) => {
    if (messages.length === 0) return
    const last = messages[messages.length - 1] as unknown as Record<
      string,
      unknown
    >
    const signature = `${messages.length}:${typeof last?.uuid === 'string' ? last.uuid : typeof last?.id === 'string' ? last.id : 'unknown'}`
    if (signature === lastSignature) return
    lastSignature = signature

    const payload = {
      at: new Date().toISOString(),
      sessionId: getSessionId(),
      messageCount: messages.length,
      lastType: typeof last?.type === 'string' ? last.type : 'unknown',
    }
    const date = payload.at.slice(0, 10)
    const path = join(root, `${date}.jsonl`)
    await appendFile(path, `${JSON.stringify(payload)}\n`, 'utf8')
  }
}
