import { randomUUID } from 'crypto'
import { mkdir, rm } from 'fs/promises'
import { createServer, type Server, type Socket } from 'net'
import { dirname, join } from 'path'
import { tmpdir } from 'os'

type UdsStartOptions = {
  isExplicit?: boolean
}

let udsServer: Server | null = null
let udsSocketPath: string | null = null
let onEnqueue: (() => void) | null = null

export function getDefaultUdsSocketPath(): string {
  return join(tmpdir(), `claude-messaging-${process.pid}.sock`)
}

export function getUdsMessagingSocketPath(): string | null {
  return udsSocketPath
}

export function setOnEnqueue(callback: (() => void) | null): void {
  onEnqueue = callback
}

function decodeMessage(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  try {
    const parsed = JSON.parse(trimmed) as { message?: unknown }
    return typeof parsed.message === 'string' ? parsed.message : trimmed
  } catch {
    return trimmed
  }
}

function handleConnection(socket: Socket): void {
  let buffer = ''
  socket.on('data', chunk => {
    buffer += chunk.toString('utf8')
    if (!buffer.includes('\n')) return

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const msg = decodeMessage(line)
      if (msg) {
        onEnqueue?.()
      }
    }
  })
  socket.on('error', () => {
    socket.destroy()
  })
}

export async function startUdsMessaging(
  socketPath: string,
  _opts?: UdsStartOptions,
): Promise<void> {
  if (process.platform === 'win32') return

  if (udsServer && udsSocketPath === socketPath) {
    process.env.CLAUDE_CODE_MESSAGING_SOCKET = socketPath
    return
  }

  if (udsServer) {
    await new Promise<void>(resolve => udsServer?.close(() => resolve()))
    udsServer = null
  }

  await mkdir(dirname(socketPath), { recursive: true })
  await rm(socketPath, { force: true })

  const server = createServer(handleConnection)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(socketPath, () => {
      server.off('error', reject)
      resolve()
    })
  })

  udsServer = server
  udsSocketPath = socketPath
  process.env.CLAUDE_CODE_MESSAGING_SOCKET = socketPath
  process.env.CLAUDE_CODE_MESSAGING_INSTANCE_ID = randomUUID()
}
