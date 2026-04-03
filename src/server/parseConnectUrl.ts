function normalizeServerUrl(raw: string): string {
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

export function parseConnectUrl(ccUrl: string): {
  serverUrl: string
  authToken: string | undefined
} {
  let parsed: URL
  try {
    parsed = new URL(ccUrl)
  } catch {
    throw new Error(`Invalid connect URL: ${ccUrl}`)
  }

  const authToken =
    parsed.searchParams.get('token') ??
    parsed.searchParams.get('authToken') ??
    undefined

  if (parsed.protocol === 'cc:') {
    if (!parsed.hostname) {
      throw new Error(`Invalid cc:// URL: missing host in ${ccUrl}`)
    }
    const port = parsed.port ? `:${parsed.port}` : ''
    return {
      serverUrl: normalizeServerUrl(`http://${parsed.hostname}${port}`),
      authToken,
    }
  }

  if (parsed.protocol === 'cc+unix:') {
    const encodedSocketPath = `${parsed.hostname}${parsed.pathname}`.trim()
    if (!encodedSocketPath) {
      throw new Error(`Invalid cc+unix:// URL: missing socket path in ${ccUrl}`)
    }
    let socketPath: string
    try {
      socketPath = decodeURIComponent(encodedSocketPath)
    } catch {
      throw new Error(`Invalid cc+unix:// URL: bad encoded socket path`)
    }
    if (!socketPath.startsWith('/')) {
      throw new Error(
        `Invalid cc+unix:// URL: socket path must be absolute (${socketPath})`,
      )
    }
    return {
      serverUrl: normalizeServerUrl(`unix:${socketPath}`),
      authToken,
    }
  }

  throw new Error(`Unsupported connect URL scheme: ${parsed.protocol}`)
}
