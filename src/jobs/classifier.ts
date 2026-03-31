import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import type { AssistantMessage } from '../types/message.js'

type JobState = {
  updatedAt: string
  status: 'idle' | 'running'
  assistantMessageCount: number
  toolUseCount: number
}

function countToolUses(messages: AssistantMessage[]): number {
  let count = 0
  for (const m of messages) {
    const content = m?.message?.content
    if (!Array.isArray(content)) continue
    for (const block of content) {
      if ((block as { type?: unknown }).type === 'tool_use') {
        count++
      }
    }
  }
  return count
}

export async function classifyAndWriteState(
  jobDir: string,
  assistantMessages: AssistantMessage[],
): Promise<void> {
  const toolUseCount = countToolUses(assistantMessages)
  const state: JobState = {
    updatedAt: new Date().toISOString(),
    status: toolUseCount > 0 ? 'running' : 'idle',
    assistantMessageCount: assistantMessages.length,
    toolUseCount,
  }

  await mkdir(jobDir, { recursive: true })
  await writeFile(join(jobDir, 'state.json'), `${JSON.stringify(state)}\n`, 'utf8')
}
