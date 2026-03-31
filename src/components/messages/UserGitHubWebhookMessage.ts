import React from 'react'
import type { TextBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { Box, Text } from '../../ink.js'
import { truncateToWidth } from '../../utils/format.js'
import { extractTag } from '../../utils/messages.js'

type Props = {
  addMargin: boolean
  param: TextBlockParam
}

function summarizeWebhookPayload(raw: string): string {
  const text = raw.trim()
  if (!text) return 'GitHub webhook received'
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    const event = typeof parsed.event === 'string' ? parsed.event : undefined
    const action =
      typeof parsed.action === 'string' ? parsed.action : undefined
    const repo =
      typeof parsed.repository === 'string'
        ? parsed.repository
        : typeof parsed.repo === 'string'
          ? parsed.repo
          : undefined
    const parts = [event, action, repo].filter(Boolean)
    if (parts.length > 0) return parts.join(' ')
  } catch {
    // non-json payload, render compact text summary
  }
  return truncateToWidth(text.replace(/\s+/g, ' '), 90)
}

export function UserGitHubWebhookMessage({
  addMargin,
  param: { text },
}: Props): React.ReactNode {
  const payload = extractTag(text, 'github-webhook-activity')
  if (!payload) return null
  const summary = summarizeWebhookPayload(payload)
  return React.createElement(
    Box,
    { marginTop: addMargin ? 1 : 0 },
    React.createElement(
      Text,
      null,
      React.createElement(Text, { color: 'green' }, 'github'),
      ' ',
      summary,
    ),
  )
}
