import { request } from 'http'
import type {
  SDKMessage,
  SDKResultMessage,
} from '../entrypoints/agentSdkTypes.js'
import type { RemotePermissionResponse } from '../remote/RemoteSessionManager.js'
import { DirectConnectSessionManager } from './directConnectManager.js'
import type { DirectConnectConfig } from './directConnectManager.js'

function writeJsonLine(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`)
}

function readPromptFromStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = []
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => chunks.push(chunk))
    process.stdin.on('error', reject)
    process.stdin.on('end', () => resolve(chunks.join('').trim()))
    process.stdin.resume()
  })
}

function writeTextResult(message: SDKResultMessage): void {
  switch (message.subtype) {
    case 'success':
      process.stdout.write(
        message.result.endsWith('\n') ? message.result : `${message.result}\n`,
      )
      return
    case 'error_during_execution':
      process.stdout.write('Execution error\n')
      return
    case 'error_max_turns':
      process.stdout.write('Error: Reached max turns\n')
      return
    case 'error_max_budget_usd':
      process.stdout.write('Error: Exceeded USD budget\n')
      return
    case 'error_max_structured_output_retries':
      process.stdout.write(
        'Error: Failed to provide valid structured output after maximum retries\n',
      )
      return
    default:
      process.stdout.write('Error: Request failed\n')
  }
}

function extractResult(messages: SDKMessage[]): SDKResultMessage | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message?.type === 'result') {
      return message
    }
  }
  return null
}

async function postMessagesHttp(
  config: DirectConnectConfig,
  prompt: string,
): Promise<SDKMessage[]> {
  const path = `/sessions/${config.sessionId}/messages`
  const body = JSON.stringify({
    prompt,
  })
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }
  if (config.authToken) {
    headers.authorization = `Bearer ${config.authToken}`
  }

  if (config.serverUrl.startsWith('unix:')) {
    const socketPath = config.serverUrl.slice('unix:'.length)
    return await new Promise<SDKMessage[]>((resolve, reject) => {
      const req = request(
        {
          socketPath,
          path,
          method: 'POST',
          headers: {
            ...headers,
            'content-length': Buffer.byteLength(body).toString(),
          },
        },
        res => {
          const chunks: Buffer[] = []
          res.on('data', chunk =>
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
          )
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8')
            let parsed: unknown
            try {
              parsed = raw.trim() ? JSON.parse(raw) : {}
            } catch {
              reject(new Error(`Invalid JSON response: ${raw}`))
              return
            }
            if ((res.statusCode ?? 500) >= 400) {
              reject(
                new Error(
                  `Failed to submit prompt: ${res.statusCode} ${res.statusMessage ?? ''}`.trim(),
                ),
              )
              return
            }
            const messages = Array.isArray((parsed as { messages?: unknown }).messages)
              ? ((parsed as { messages: SDKMessage[] }).messages ?? [])
              : []
            resolve(messages)
          })
        },
      )
      req.on('error', reject)
      req.write(body)
      req.end()
    })
  }

  const response = await fetch(`${config.serverUrl}${path}`, {
    method: 'POST',
    headers,
    body,
  })
  if (!response.ok) {
    throw new Error(
      `Failed to submit prompt: ${response.status} ${response.statusText}`,
    )
  }
  const parsed = (await response.json()) as { messages?: SDKMessage[] }
  return Array.isArray(parsed.messages) ? parsed.messages : []
}

export async function runConnectHeadless(
  config: DirectConnectConfig,
  prompt: string,
  outputFormat: string,
  interactive: boolean,
): Promise<void> {
  const initialPrompt =
    prompt ||
    (interactive && !process.stdin.isTTY ? await readPromptFromStdin() : '')

  if (!initialPrompt) {
    const message =
      'No prompt provided. Pass -p "<prompt>" or pipe prompt text to stdin.'
    if (outputFormat === 'stream-json') {
      writeJsonLine({
        type: 'result',
        subtype: 'error_during_execution',
        is_error: true,
        session_id: config.sessionId,
        result: message,
      })
      return
    }
    if (outputFormat === 'json') {
      process.stdout.write(
        `${JSON.stringify({
          type: 'result',
          subtype: 'error_during_execution',
          is_error: true,
          session_id: config.sessionId,
          result: message,
        })}\n`,
      )
      return
    }
    process.stdout.write(`${message}\n`)
    return
  }

  // Unix direct-connect servers currently expose HTTP endpoints only.
  if (config.serverUrl.startsWith('unix:')) {
    const messages = await postMessagesHttp(config, initialPrompt)
    if (outputFormat === 'stream-json') {
      for (const message of messages) writeJsonLine(message)
      return
    }
    const result = extractResult(messages)
    if (!result) {
      throw new Error('No result message returned from direct-connect session')
    }
    if (outputFormat === 'json') {
      process.stdout.write(`${JSON.stringify(result)}\n`)
      return
    }
    writeTextResult(result)
    return
  }

  await new Promise<void>((resolve, reject) => {
    let settled = false
    let finalResult: SDKResultMessage | null = null
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      manager.disconnect()
      fn()
    }

    const manager = new DirectConnectSessionManager(config, {
      onMessage: message => {
        if (outputFormat === 'stream-json') {
          writeJsonLine(message)
        }

        if (message.type === 'result') {
          finalResult = message
          finish(() => {
            if (outputFormat === 'json') {
              process.stdout.write(`${JSON.stringify(message)}\n`)
            } else {
              writeTextResult(message)
            }
            resolve()
          })
        }
      },
      onPermissionRequest: (request, requestId) => {
        const response: RemotePermissionResponse = {
          behavior: 'deny',
          message:
            'Permission prompts are not supported in direct-connect headless mode.',
        }
        manager.respondToPermissionRequest(requestId, response)
        if (outputFormat === 'stream-json') {
          writeJsonLine({
            type: 'system',
            subtype: 'warning',
            session_id: config.sessionId,
            request_id: requestId,
            tool_name:
              typeof request.tool_name === 'string'
                ? request.tool_name
                : undefined,
            message: response.message,
          })
        }
      },
      onError: error => {
        finish(() => reject(error))
      },
      onDisconnected: () => {
        if (finalResult) return
        const message = new Error('Direct-connect session disconnected')
        finish(() => reject(message))
      },
      onConnected: () => {
        const sent = manager.sendMessage(initialPrompt)
        if (!sent) {
          finish(() =>
            reject(
              new Error('Failed to send prompt: session is not connected'),
            ),
          )
          return
        }
        if (outputFormat === 'stream-json') {
          writeJsonLine({
            type: 'user',
            session_id: config.sessionId,
            message: initialPrompt,
            interactive,
          })
        }
      },
    })

    manager.connect()
    timeoutId = setTimeout(() => {
      if (settled || finalResult) return
      finish(() => {
        if (outputFormat === 'stream-json') {
          writeJsonLine({
            type: 'result',
            subtype: 'error_during_execution',
            is_error: true,
            session_id: config.sessionId,
            result: 'Timed out waiting for response from direct-connect session',
          })
          resolve()
          return
        }
        reject(
          new Error('Timed out waiting for response from direct-connect session'),
        )
      })
    }, 30_000)
  })
}
