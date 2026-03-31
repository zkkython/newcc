import type { DirectConnectConfig } from './directConnectManager.js'

function writeJsonLine(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`)
}

export async function runConnectHeadless(
  config: DirectConnectConfig,
  prompt: string,
  outputFormat: string,
  interactive: boolean,
): Promise<void> {
  const note =
    'Direct-connect headless execution is partially reconstructed; full remote turn streaming is not restored yet.'

  if (outputFormat === 'stream-json') {
    writeJsonLine({
      type: 'system',
      subtype: 'info',
      message: note,
      session_id: config.sessionId,
      interactive,
    })
    if (prompt) {
      writeJsonLine({
        type: 'assistant',
        message: `Prompt accepted (reconstructed mode): ${prompt}`,
      })
    }
    return
  }

  if (outputFormat === 'json') {
    process.stdout.write(
      `${JSON.stringify({
        sessionId: config.sessionId,
        interactive,
        message: prompt
          ? `Prompt accepted (reconstructed mode): ${prompt}`
          : note,
      })}\n`,
    )
    return
  }

  process.stdout.write(`${note}\n`)
  if (prompt) {
    process.stdout.write(`Prompt accepted (reconstructed mode): ${prompt}\n`)
  }
}
