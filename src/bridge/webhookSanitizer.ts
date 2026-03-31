function sanitizeString(text: string): string {
  // Minimal hardening: strip NUL/control chars that can break terminal/UI.
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
}

export function sanitizeInboundWebhookContent<T>(content: T): T {
  if (typeof content === 'string') {
    return sanitizeString(content) as T
  }
  if (Array.isArray(content)) {
    return content.map(item => {
      if (typeof item === 'string') return sanitizeString(item)
      if (item && typeof item === 'object' && 'text' in item) {
        return {
          ...item,
          text: sanitizeString(String((item as { text?: unknown }).text ?? '')),
        }
      }
      return item
    }) as T
  }
  return content
}
