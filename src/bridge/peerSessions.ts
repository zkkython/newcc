export type InterClaudePostResult =
  | { ok: true }
  | { ok: false; error: string }

export async function postInterClaudeMessage(
  _sessionId: string,
  _message: string,
): Promise<InterClaudePostResult> {
  // Bridge peer routing requires the remote-control bridge runtime.
  // Keep this explicit in reconstructed mode so callers can surface
  // a useful error instead of silently dropping the message.
  return {
    ok: false,
    error: 'bridge peer session routing is not restored in reconstructed mode',
  }
}
