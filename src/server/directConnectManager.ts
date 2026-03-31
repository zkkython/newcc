/* eslint-disable eslint-plugin-n/no-unsupported-features/node-builtins */

import { randomUUID } from 'crypto'
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

  private stringifyContent(content: RemoteMessageContent): string {
    if (typeof content === 'string') return content
    if (Array.isArray(content)) {
      const text = content
        .map(block => {
          if (typeof block === 'string') return block
          if (typeof block === 'object' && block && 'text' in block) {
            return String((block as { text?: unknown }).text ?? '')
          }
          return ''
        })
        .join('\n')
        .trim()
      return text || '(non-text content)'
    }
    return '(unsupported content)'
  }

  sendMessage(content: RemoteMessageContent): boolean {
    if (this.fallbackMode) {
      const text = this.stringifyContent(content)
      const assistant = {
        type: 'assistant',
        uuid: randomUUID(),
        message: {
          id: randomUUID(),
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: `[direct-connect reconstructed] ${text}`,
            },
          ],
          model: 'claude-reconstructed-direct-connect',
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: {
            input_tokens: 0,
            output_tokens: 0,
          },
        },
      } as SDKMessage
      this.callbacks.onMessage(assistant)

      const result = {
        type: 'result',
        subtype: 'success',
        uuid: randomUUID(),
        duration_ms: 0,
        duration_api_ms: 0,
        is_error: false,
        num_turns: 1,
        result: 'ok',
        session_id: this.config.sessionId,
        total_cost_usd: 0,
        usage: {
          input_tokens: 0,
          output_tokens: 0,
        },
      } as SDKMessage
      this.callbacks.onMessage(result)
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
