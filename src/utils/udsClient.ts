import { connect } from 'net'

export type LiveSessionInfo = {
  kind?: string
  sessionId?: string
}

export async function listAllLiveSessions(): Promise<LiveSessionInfo[]> {
  // Reconstructed mode currently does not maintain a multi-session UDS registry.
  return []
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
