/* eslint-disable eslint-plugin-n/no-unsupported-features/node-builtins */

import { randomUUID } from 'crypto'
import { request } from 'http'
import type { SDKMessage } from '../entrypoints/agentSdkTypes.js'
import type {
  SDKControlPermissionRequest,
  StdoutMessage,
} from '../entrypoints/sdk/controlTypes.js'
import type { RemotePermissionResponse } from '../remote/RemoteSessionManager.js'
import { logForDebugging } from '../utils/debug.js'
import { jsonParse, jsonStringify } from '../utils/slowOperations.js'
import type { RemoteMessageContent } from '../utils/teleport/api.js'

export type DirectConnectConfig = {
  serverUrl: string
  sessionId: string
  wsUrl: string
  authToken?: string
}

export type DirectConnectCallbacks = {
  onMessage: (message: SDKMessage) => void
  onPermissionRequest: (
    request: SDKControlPermissionRequest,
    requestId: string,
  ) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: Error) => void
}

function isStdoutMessage(value: unknown): value is StdoutMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof value.type === 'string'
  )
}

export class DirectConnectSessionManager {
  private ws: WebSocket | null = null
  private connected = false
  private fallbackMode = false
  private config: DirectConnectConfig
  private callbacks: DirectConnectCallbacks

  constructor(config: DirectConnectConfig, callbacks: DirectConnectCallbacks) {
    this.config = config
    this.callbacks = callbacks
  }

  connect(): void {
    const emitFallbackInit = (): void => {
      const initMessage = {
        type: 'system',
        subtype: 'init',
        uuid: randomUUID(),
        model: 'claude-reconstructed-direct-connect',
        cwd: process.cwd(),
        permission_mode: 'default',
      } as SDKMessage
      this.callbacks.onConnected?.()
      this.callbacks.onMessage(initMessage)
    }

    const headers: Record<string, string> = {}
    if (this.config.authToken) {
      headers['authorization'] = `Bearer ${this.config.authToken}`
    }
    try {
      // Bun's WebSocket supports headers option but the DOM typings don't
      this.ws = new WebSocket(this.config.wsUrl, {
        headers,
      } as unknown as string[])
    } catch {
      this.fallbackMode = true
      this.connected = true
      emitFallbackInit()
      return
    }

    this.ws.addEventListener('open', () => {
      this.connected = true
      this.callbacks.onConnected?.()
    })

    this.ws.addEventListener('message', event => {
      const data = typeof event.data === 'string' ? event.data : ''
      const lines = data.split('\n').filter((l: string) => l.trim())

      for (const line of lines) {
        let raw: unknown
        try {
          raw = jsonParse(line)
        } catch {
          continue
        }

        if (!isStdoutMessage(raw)) {
          continue
        }
        const parsed = raw

        // Handle control requests (permission requests)
        if (parsed.type === 'control_request') {
          if (parsed.request.subtype === 'can_use_tool') {
            this.callbacks.onPermissionRequest(
              parsed.request,
              parsed.request_id,
            )
          } else {
            // Send an error response for unrecognized subtypes so the
            // server doesn't hang waiting for a reply that never comes.
            logForDebugging(
              `[DirectConnect] Unsupported control request subtype: ${parsed.request.subtype}`,
            )
            this.sendErrorResponse(
              parsed.request_id,
              `Unsupported control request subtype: ${parsed.request.subtype}`,
            )
          }
          continue
        }

        // Forward SDK messages (assistant, result, system, etc.)
        if (
          parsed.type !== 'control_response' &&
          parsed.type !== 'keep_alive' &&
          parsed.type !== 'control_cancel_request' &&
          parsed.type !== 'streamlined_text' &&
          parsed.type !== 'streamlined_tool_use_summary' &&
          !(parsed.type === 'system' && parsed.subtype === 'post_turn_summary')
        ) {
          this.callbacks.onMessage(parsed)
        }
      }
    })

    this.ws.addEventListener('close', () => {
      if (this.fallbackMode) {
        return
      }
      if (!this.connected) {
        // Reconstructed fallback: if we cannot establish WS, keep the
        // session alive locally instead of hard-failing the REPL.
        this.fallbackMode = true
        this.connected = true
        emitFallbackInit()
        return
      }
      this.connected = false
      this.callbacks.onDisconnected?.()
    })

    this.ws.addEventListener('error', () => {
      if (!this.connected) {
        this.fallbackMode = true
        this.connected = true
        emitFallbackInit()
        return
      }
      this.callbacks.onError?.(new Error('WebSocket connection error'))
    })
  }

  private async postMessagesHttp(
    content: RemoteMessageContent,
  ): Promise<SDKMessage[]> {
    const path = `/sessions/${this.config.sessionId}/messages`
    const payload = jsonStringify({
      prompt: content,
    })
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    }
    if (this.config.authToken) {
      headers.authorization = `Bearer ${this.config.authToken}`
    }

    if (this.config.serverUrl.startsWith('unix:')) {
      const socketPath = this.config.serverUrl.slice('unix:'.length)
      return await new Promise<SDKMessage[]>((resolve, reject) => {
        const req = request(
          {
            socketPath,
            path,
            method: 'POST',
            headers: {
              ...headers,
              'content-length': Buffer.byteLength(payload).toString(),
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
                parsed = raw.trim() ? jsonParse(raw) : {}
              } catch {
                reject(new Error(`Invalid JSON response: ${raw}`))
                return
              }
              if ((res.statusCode ?? 500) >= 400) {
                reject(
                  new Error(
                    `HTTP ${(res.statusCode ?? 500).toString()} ${res.statusMessage ?? ''}`.trim(),
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
        req.write(payload)
        req.end()
      })
    }

    const response = await fetch(`${this.config.serverUrl}${path}`, {
      method: 'POST',
      headers,
      body: payload,
    })
    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status.toString()} ${response.statusText}`.trim(),
      )
    }
    const parsed = (await response.json()) as { messages?: SDKMessage[] }
    return Array.isArray(parsed.messages) ? parsed.messages : []
  }

  private sendMessageViaHttpFallback(content: RemoteMessageContent): void {
    void this.postMessagesHttp(content)
      .then(messages => {
        for (const message of messages) {
          this.callbacks.onMessage(message)
        }
      })
      .catch(error => {
        logForDebugging(
          `[DirectConnect] HTTP fallback message submission failed: ${error instanceof Error ? error.message : String(error)}`,
        )
        const result = {
          type: 'result',
          subtype: 'error_during_execution',
          uuid: randomUUID(),
          duration_ms: 0,
          duration_api_ms: 0,
          is_error: true,
          num_turns: 1,
          session_id: this.config.sessionId,
          total_cost_usd: 0,
          usage: {
            input_tokens: 0,
            output_tokens: 0,
          },
          result:
            error instanceof Error
              ? error.message
              : 'HTTP fallback message submission failed',
        } as SDKMessage
        this.callbacks.onMessage(result)
      })
  }

  sendMessage(content: RemoteMessageContent): boolean {
    if (this.fallbackMode) {
      // Fallback mode preserves a usable direct-connect loop by posting prompts
      // through the server's HTTP endpoint when WS transport is unavailable.
      this.sendMessageViaHttpFallback(content)
      return true
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false
    }

    // Must match SDKUserMessage format expected by `--input-format stream-json`
    const message = jsonStringify({
      type: 'user',
      message: {
        role: 'user',
        content: content,
      },
      parent_tool_use_id: null,
      session_id: '',
    })
    this.ws.send(message)
    return true
  }

  respondToPermissionRequest(
    requestId: string,
    result: RemotePermissionResponse,
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    // Must match SDKControlResponse format expected by StructuredIO
    const response = jsonStringify({
      type: 'control_response',
      response: {
        subtype: 'success',
        request_id: requestId,
        response: {
          behavior: result.behavior,
          ...(result.behavior === 'allow'
            ? { updatedInput: result.updatedInput }
            : { message: result.message }),
        },
      },
    })
    this.ws.send(response)
  }

  /**
   * Send an interrupt signal to cancel the current request
   */
  sendInterrupt(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    // Must match SDKControlRequest format expected by StructuredIO
    const request = jsonStringify({
      type: 'control_request',
      request_id: crypto.randomUUID(),
      request: {
        subtype: 'interrupt',
      },
    })
    this.ws.send(request)
  }

  private sendErrorResponse(requestId: string, error: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }
    const response = jsonStringify({
      type: 'control_response',
      response: {
        subtype: 'error',
        request_id: requestId,
        error,
      },
    })
    this.ws.send(response)
  }

  disconnect(): void {
    this.connected = false
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  isConnected(): boolean {
    if (this.fallbackMode) return this.connected
    return this.ws?.readyState === WebSocket.OPEN
  }
}
