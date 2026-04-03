import { listAllLiveSessions, sendToUdsSocket } from '../utils/udsClient.js'
import { errorMessage } from '../utils/errors.js'

export type InterClaudePostResult =
  | { ok: true }
  | { ok: false; error: string }

export async function postInterClaudeMessage(
  sessionId: string,
  message: string,
): Promise<InterClaudePostResult> {
  const peers = await listAllLiveSessions()
  const target = peers.find(
    peer =>
      (peer.bridgeSessionId && peer.bridgeSessionId === sessionId) ||
      (peer.sessionId && peer.sessionId === sessionId),
  )
  if (!target) {
    return {
      ok: false,
      error: `No live peer found for session ${sessionId}`,
    }
  }
  if (!target.messagingSocketPath) {
    return {
      ok: false,
      error: `Peer ${sessionId} has no messaging socket path`,
    }
  }

  try {
    await sendToUdsSocket(target.messagingSocketPath, message)
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error),
    }
  }
}
