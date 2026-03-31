import type { ChildProcess } from 'child_process'

export type BackendSession = {
  process: ChildProcess | null
  workDir: string
}

/**
 * Minimal in-process fallback backend for reconstructed direct-connect mode.
 * The original implementation spawns managed CLI workers.
 */
export class DangerousBackend {
  async createSession(opts: { cwd: string }): Promise<BackendSession> {
    return {
      process: null,
      workDir: opts.cwd,
    }
  }

  async destroySession(_sessionId: string): Promise<void> {
    return
  }
}
