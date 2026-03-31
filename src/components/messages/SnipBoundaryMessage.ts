import React from 'react'
import type { Message } from '../../types/message.js'
import { Box, Text } from '../../ink.js'

type Props = {
  message: Message
}

export function SnipBoundaryMessage({ message }: Props): React.ReactNode {
  const note =
    (message as { content?: unknown }).content &&
    typeof (message as { content?: unknown }).content === 'string'
      ? String((message as { content?: string }).content).trim()
      : 'Earlier context was compacted to keep the session focused.'

  return React.createElement(
    Box,
    { marginTop: 1 },
    React.createElement(Text, { dimColor: true }, `··· ${note}`),
  )
}
