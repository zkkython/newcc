import { randomUUID } from 'crypto'
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
  }

  async destroyAll(): Promise<void> {
    const ids = Array.from(this.sessions.keys())
    for (const id of ids) {
      await this.destroySession(id)
    }
  }
}
