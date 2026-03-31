import type { BetaContentBlock } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'

export type ConnectorTextBlock = {
  type: 'connector_text'
  connector_text: string
  signature?: string
} & Record<string, unknown>

export type ConnectorTextDelta = {
  type: 'connector_text_delta'
  connector_text: string
}

export function isConnectorTextBlock(
  block: BetaContentBlock | unknown,
): block is ConnectorTextBlock {
  return (
    block !== null &&
    typeof block === 'object' &&
    (block as { type?: unknown }).type === 'connector_text' &&
    typeof (block as { connector_text?: unknown }).connector_text === 'string'
  )
}
