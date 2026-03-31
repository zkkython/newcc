import type { ChildProcess } from 'child_process'
import { SSHSessionManager, type SSHSessionCallbacks } from './SSHSessionManager.js'

export class SSHSessionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SSHSessionError'
  }
}

type SessionProxy = {
  stop: () => void
}

export type SSHSession = {
  remoteCwd: string
  proc: ChildProcess
  proxy: SessionProxy
  createManager: (callbacks: SSHSessionCallbacks) => SSHSessionManager
  getStderrTail: () => string
}

function createStubChildProcess(): ChildProcess {
  return {
    exitCode: null,
    signalCode: null,
  } as unknown as ChildProcess
}

function createStubSession(remoteCwd: string): SSHSession {
  const proc = createStubChildProcess()
  const proxy: SessionProxy = {
    stop(): void {
      return
    },
  }
  return {
    remoteCwd,
    proc,
    proxy,
    createManager(callbacks: SSHSessionCallbacks): SSHSessionManager {
      return new SSHSessionManager(remoteCwd, callbacks)
    },
    getStderrTail(): string {
      return ''
    },
  }
}

export async function createSSHSession(
  opts: {
    host: string
    cwd?: string
    localVersion: string
    permissionMode?: string
    dangerouslySkipPermissions?: boolean
    extraCliArgs?: string[]
  },
  _progress?: { onProgress?: (message: string) => void },
): Promise<SSHSession> {
  if (!opts.host) {
    throw new SSHSessionError('Missing SSH host')
  }
  throw new SSHSessionError(
    'Remote SSH transport is not restored yet. Use `claude ssh <host> --local` in reconstructed mode.',
  )
}

export function createLocalSSHSession(opts: {
  cwd?: string
  permissionMode?: string
  dangerouslySkipPermissions?: boolean
}): SSHSession {
  return createStubSession(opts.cwd ?? process.cwd())
}
