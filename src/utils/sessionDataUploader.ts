import type { Message } from '../types/message.js'

export type SessionTurnUploader = (messages: Message[]) => Promise<void>

export async function createSessionTurnUploader(): Promise<SessionTurnUploader> {
  // Reconstructed baseline: keep hook wiring valid while disabling remote upload.
  return async (_messages: Message[]) => {}
}
