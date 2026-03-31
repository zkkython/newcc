import React from 'react'
import type { TextBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { Box, Text } from '../../ink.js'
import { truncateToWidth } from '../../utils/format.js'
import { CROSS_SESSION_MESSAGE_TAG } from '../../constants/xml.js'

type Props = {
  addMargin: boolean
  param: TextBlockParam
}

function getAttr(attrs: string, name: string): string | undefined {
  const m = new RegExp(`\\b${name}="([^"]+)"`).exec(attrs)
  return m?.[1]
}

export function UserCrossSessionMessage({
  addMargin,
  param: { text },
}: Props): React.ReactNode {
  const match = new RegExp(
    `<${CROSS_SESSION_MESSAGE_TAG}([^>]*)>([\\s\\S]*?)</${CROSS_SESSION_MESSAGE_TAG}>`,
    'i',
  ).exec(text)
  if (!match) return null

  const attrs = match[1] ?? ''
  const body = (match[2] ?? '').trim().replace(/\s+/g, ' ')
  const from = getAttr(attrs, 'from') ?? 'peer'
  const summary = getAttr(attrs, 'summary')
  const preview = truncateToWidth(body, 80)

  return React.createElement(
    Box,
    { marginTop: addMargin ? 1 : 0 },
    React.createElement(
      Text,
      null,
      React.createElement(Text, { color: 'cyan' }, 'msg'),
      ' ',
      React.createElement(Text, { dimColor: true }, `${from}:`),
      ' ',
      summary
        ? `${summary} - ${preview}`
        : preview,
    ),
  )
}
