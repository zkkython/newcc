import type { Message } from '../../types/message.js'

/**
 * Reconstructed no-op transcript writers.
 * Keeps Kairos-gated call sites safe until full transcript archival logic is restored.
 */
export async function writeSessionTranscriptSegment(
  _messages: readonly Message[],
): Promise<void> {}

export function flushOnDateChange(
  _messages: readonly Message[],
  _currentDate: string,
): void {}
