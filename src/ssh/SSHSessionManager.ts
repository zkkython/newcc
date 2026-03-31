import { randomUUID } from 'crypto'
import type { SDKMessage } from '../entrypoints/agentSdkTypes.js'
import type { SDKControlPermissionRequest } from '../entrypoints/sdk/controlTypes.js'
import type { RemotePermissionResponse } from '../remote/RemoteSessionManager.js'
import type { RemoteMessageContent } from '../utils/teleport/api.js'

export type SSHSessionCallbacks = {
  onMessage: (message: SDKMessage) => void
  onPermissionRequest: (
    request: SDKControlPermissionRequest,
    requestId: string,
  ) => void
  onConnected?: () => void
  onReconnecting?: (attempt: number, max: number) => void
  onDisconnected?: () => void
  onError?: (error: Error) => void
}

function stringifyContent(content: RemoteMessageContent): string {
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

export class SSHSessionManager {
  private connected = false

  constructor(
    private readonly remoteCwd: string,
    private readonly callbacks: SSHSessionCallbacks,
  ) {}

  connect(): void {
    this.connected = true
    const initMessage = {
      type: 'system',
      subtype: 'init',
      uuid: randomUUID(),
      model: 'claude-reconstructed-ssh',
      cwd: this.remoteCwd,
      permission_mode: 'default',
    } as SDKMessage
    this.callbacks.onConnected?.()
    this.callbacks.onMessage(initMessage)
  }

  disconnect(): void {
    if (!this.connected) return
    this.connected = false
    this.callbacks.onDisconnected?.()
  }

  isConnected(): boolean {
    return this.connected
  }

  sendMessage(content: RemoteMessageContent): boolean {
    if (!this.connected) return false
    const text = stringifyContent(content)

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
            text: `[ssh reconstructed] ${text}`,
          },
        ],
        model: 'claude-reconstructed-ssh',
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
      session_id: randomUUID(),
      total_cost_usd: 0,
      usage: {
        input_tokens: 0,
        output_tokens: 0,
      },
    } as SDKMessage
    this.callbacks.onMessage(result)
    return true
  }

  respondToPermissionRequest(
    _requestId: string,
    _result: RemotePermissionResponse,
  ): void {
    return
  }

  sendInterrupt(): void {
    return
  }
}
