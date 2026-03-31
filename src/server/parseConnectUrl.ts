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
    throw new Error(
      'cc+unix:// direct-connect is not supported in reconstructed mode yet',
    )
  }

  throw new Error(`Unsupported connect URL scheme: ${parsed.protocol}`)
}
