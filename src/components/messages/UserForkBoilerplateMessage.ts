import React from 'react'
import type { TextBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { Box, Text } from '../../ink.js'
import { FORK_BOILERPLATE_TAG, FORK_DIRECTIVE_PREFIX } from '../../constants/xml.js'

type Props = {
  addMargin: boolean
  param: TextBlockParam
}

function extractDirective(text: string): string | null {
  const boilerplateRe = new RegExp(
    `<${FORK_BOILERPLATE_TAG}>[\\s\\S]*?</${FORK_BOILERPLATE_TAG}>\\s*`,
    'i',
  )
  if (!boilerplateRe.test(text)) return null
  const withoutBoilerplate = text.replace(boilerplateRe, '').trim()
  if (!withoutBoilerplate) return null
  return withoutBoilerplate.startsWith(FORK_DIRECTIVE_PREFIX)
    ? withoutBoilerplate.slice(FORK_DIRECTIVE_PREFIX.length).trim()
    : withoutBoilerplate
}

export function UserForkBoilerplateMessage({
  addMargin,
  param,
}: Props): React.ReactNode {
  const directive = extractDirective(param.text)
  if (!directive) return null
  return React.createElement(
    Box,
    { marginTop: addMargin ? 1 : 0 },
    React.createElement(
      Text,
      null,
      React.createElement(Text, { color: 'warning' }, 'fork'),
      ' ',
      directive,
    ),
  )
}
