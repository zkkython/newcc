function extractText(content) {
  if (!content) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter(block => block && block.type === 'text' && typeof block.text === 'string')
      .map(block => block.text)
      .join('\n')
  }
  return ''
}

function trimPreview(text, max = 200) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max)}...`
}

const call = async (_args, context) => {
  const messages = context?.messages ?? []
  let userCount = 0
  let assistantCount = 0
  let systemCount = 0
  let otherCount = 0
  let lastUser = ''
  let lastAssistant = ''

  for (const msg of messages) {
    if (msg?.type === 'user') {
      userCount += 1
      lastUser = extractText(msg?.message?.content)
      continue
    }
    if (msg?.type === 'assistant') {
      assistantCount += 1
      lastAssistant = extractText(msg?.message?.content)
      continue
    }
    if (msg?.type === 'system') {
      systemCount += 1
      continue
    }
    otherCount += 1
  }

  const lines = [
    `Messages: ${messages.length}`,
    `- user: ${userCount}`,
    `- assistant: ${assistantCount}`,
    `- system: ${systemCount}`,
    `- other: ${otherCount}`,
    lastUser ? `Last user: ${trimPreview(lastUser)}` : 'Last user: (none)',
    lastAssistant
      ? `Last assistant: ${trimPreview(lastAssistant)}`
      : 'Last assistant: (none)',
  ]

  return {
    type: 'text',
    value: lines.join('\n'),
  }
}

export default {
  type: 'local',
  name: 'summary',
  description: 'Summarize current in-memory session state',
  isHidden: true,
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
}
