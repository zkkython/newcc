function estimateTokensFromObject(value) {
  try {
    const bytes = JSON.stringify(value).length
    return Math.max(1, Math.ceil(bytes / 4))
  } catch {
    return 1
  }
}

function messageLabel(msg, index) {
  const type = msg?.type ?? 'unknown'
  const uuid = msg?.uuid ? String(msg.uuid).slice(0, 8) : `#${index + 1}`
  return `${type}:${uuid}`
}

const call = async (_args, context) => {
  const messages = context?.messages ?? []
  if (messages.length === 0) {
    return {
      type: 'text',
      value: 'No in-memory messages available for context visualization.',
    }
  }

  const rows = messages.map((msg, idx) => ({
    idx: idx + 1,
    label: messageLabel(msg, idx),
    tokens: estimateTokensFromObject(msg),
  }))
  const total = rows.reduce((sum, r) => sum + r.tokens, 0)
  const sorted = [...rows].sort((a, b) => b.tokens - a.tokens).slice(0, 12)

  const lines = [
    `Context snapshot: ${messages.length} messages`,
    `Estimated tokens: ~${total}`,
    '',
    'Top contributors:',
    ...sorted.map(
      r =>
        `${String(r.idx).padStart(4, ' ')}  ${String(r.tokens).padStart(6, ' ')} tokens  ${r.label}`,
    ),
  ]
  return {
    type: 'text',
    value: lines.join('\n'),
  }
}

export default {
  type: 'local',
  name: 'ctx_viz',
  description: 'Show a textual context-window contribution snapshot',
  isHidden: true,
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
}

