import { connect } from 'net'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { getClaudeConfigHomeDir } from './envUtils.js'
import { isProcessRunning } from './genericProcessUtils.js'
import { jsonParse } from './slowOperations.js'

export type LiveSessionInfo = {
  kind?: string
  sessionId?: string
  pid?: number
  cwd?: string
  messagingSocketPath?: string
  name?: string
  logPath?: string
  status?: string
  waitingFor?: string
  bridgeSessionId?: string
}

export async function listAllLiveSessions(): Promise<LiveSessionInfo[]> {
  const sessionsDir = join(getClaudeConfigHomeDir(), 'sessions')
  let files: string[]
  try {
    files = await readdir(sessionsDir)
  } catch {
    return []
  }

  const results: LiveSessionInfo[] = []
  for (const file of files) {
    if (!/^\d+\.json$/.test(file)) continue
    const pid = Number.parseInt(file.slice(0, -5), 10)
    if (!Number.isFinite(pid) || pid <= 0) continue
    if (!isProcessRunning(pid)) continue

    const fullPath = join(sessionsDir, file)
    try {
      const parsed = jsonParse(await readFile(fullPath, 'utf8')) as Record<
        string,
        unknown
      >
      results.push({
        pid,
        kind: typeof parsed.kind === 'string' ? parsed.kind : undefined,
        sessionId:
          typeof parsed.sessionId === 'string' ? parsed.sessionId : undefined,
        cwd: typeof parsed.cwd === 'string' ? parsed.cwd : undefined,
        messagingSocketPath:
          typeof parsed.messagingSocketPath === 'string'
            ? parsed.messagingSocketPath
            : undefined,
        name: typeof parsed.name === 'string' ? parsed.name : undefined,
        logPath:
          typeof parsed.logPath === 'string' ? parsed.logPath : undefined,
        status: typeof parsed.status === 'string' ? parsed.status : undefined,
        waitingFor:
          typeof parsed.waitingFor === 'string'
            ? parsed.waitingFor
            : undefined,
        bridgeSessionId:
          typeof parsed.bridgeSessionId === 'string'
            ? parsed.bridgeSessionId
            : undefined,
      })
    } catch {
      // Skip malformed entries.
    }
  }

  results.sort((a, b) => (a.pid ?? 0) - (b.pid ?? 0))
  return results
}

export async function sendToUdsSocket(
  socketPath: string,
  message: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const socket = connect(socketPath)
    socket.once('error', err => {
      socket.destroy()
      reject(err)
    })
    socket.once('connect', () => {
      socket.write(`${JSON.stringify({ type: 'message', message })}\n`)
      socket.end()
      resolve()
    })
  })
}
