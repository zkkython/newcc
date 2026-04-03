import { randomUUID } from 'crypto'
import type { SDKMessage } from '../entrypoints/agentSdkTypes.js'
import {
  unstable_v2_resumeSession,
  type SDKSession,
} from '../entrypoints/agentSdkTypes.js'
import type { SessionInfo } from './types.js'

type SessionBackend = {
  createSession?: (opts: { cwd: string }) => Promise<{
    process: SessionInfo['process']
    workDir: string
  }>
  destroySession?: (sessionId: string) => Promise<void>
}

export class SessionManager {
  private readonly sessions = new Map<string, SessionInfo>()
  private readonly sessionMessages = new Map<string, SDKMessage[]>()
  private readonly sdkSessions = new Map<string, SDKSession>()
  private readonly backend: SessionBackend
  private readonly maxSessions: number

  constructor(
    backend: SessionBackend,
    opts?: { idleTimeoutMs?: number; maxSessions?: number },
  ) {
    this.backend = backend
    this.maxSessions = opts?.maxSessions ?? 32
  }

  async createSession(opts: { cwd: string }): Promise<SessionInfo> {
    if (this.maxSessions > 0 && this.sessions.size >= this.maxSessions) {
      throw new Error(`Session limit reached (${this.maxSessions})`)
    }

    const id = randomUUID()
    const createdAt = Date.now()
    const backendSession = this.backend.createSession
      ? await this.backend.createSession({ cwd: opts.cwd })
      : { process: null, workDir: opts.cwd }

    const info: SessionInfo = {
      id,
      status: 'running',
      createdAt,
      workDir: backendSession.workDir,
      process: backendSession.process ?? null,
    }
    this.sessions.set(id, info)
    this.sessionMessages.set(id, [])
    this.sdkSessions.set(
      id,
      unstable_v2_resumeSession(id, {
        options: {
          cwd: info.workDir,
        },
      }),
    )
    return info
  }

  getSession(id: string): SessionInfo | undefined {
    return this.sessions.get(id)
  }

  async destroySession(id: string): Promise<void> {
    const existing = this.sessions.get(id)
    if (!existing) return
    existing.status = 'stopping'
    await this.backend.destroySession?.(id)
    existing.status = 'stopped'
    this.sessions.delete(id)
    this.sessionMessages.delete(id)
    this.sdkSessions.delete(id)
  }

  async destroyAll(): Promise<void> {
    const ids = Array.from(this.sessions.keys())
    for (const id of ids) {
      await this.destroySession(id)
    }
  }

  async submitPrompt(sessionId: string, prompt: unknown): Promise<SDKMessage[]> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Unknown session: ${sessionId}`)
    }
    const textPrompt = this.stringifyPrompt(prompt)
    const sdkSession =
      this.sdkSessions.get(sessionId) ??
      unstable_v2_resumeSession(sessionId, {
        options: {
          cwd: session.workDir,
        },
      })
    this.sdkSessions.set(sessionId, sdkSession)

    const messages: SDKMessage[] = []
    for await (const message of sdkSession.query({ prompt: textPrompt })) {
      messages.push(message)
    }

    if (messages.length === 0) {
      messages.push({
        type: 'result',
        subtype: 'error_during_execution',
        uuid: randomUUID(),
        duration_ms: 0,
        duration_api_ms: 0,
        is_error: true,
        num_turns: 0,
        session_id: sessionId,
        total_cost_usd: 0,
        usage: {
          input_tokens: 0,
          output_tokens: 0,
        },
        errors: ['No messages returned from query engine'],
      } as SDKMessage)
    }

    const history = this.sessionMessages.get(sessionId)
    if (history) {
      history.push(...messages)
    } else {
      this.sessionMessages.set(sessionId, [...messages])
    }
    return messages
  }

  listSessionMessages(sessionId: string): SDKMessage[] {
    return [...(this.sessionMessages.get(sessionId) ?? [])]
  }

  private stringifyPrompt(prompt: unknown): string {
    if (typeof prompt === 'string') return prompt
    if (Array.isArray(prompt)) {
      return prompt
        .map(block => {
          if (typeof block === 'string') return block
          if (
            typeof block === 'object' &&
            block &&
            'type' in block &&
            (block as { type?: unknown }).type === 'text'
          ) {
            return typeof (block as { text?: unknown }).text === 'string'
              ? ((block as { text: string }).text ?? '')
              : ''
          }
          return ''
        })
        .filter(Boolean)
        .join('\n')
        .trim()
    }
    if (prompt == null) return ''
    return String(prompt)
  }
}
