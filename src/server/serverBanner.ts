import type { ServerConfig } from './types.js'

export function printBanner(
  config: ServerConfig,
  authToken: string,
  actualPort: number,
): void {
  const url = config.unix
    ? `cc+unix://${encodeURIComponent(config.unix)}?token=${encodeURIComponent(authToken)}`
    : `cc://${config.host}:${actualPort}?token=${encodeURIComponent(authToken)}`

  process.stdout.write(
    [
      'Claude server is running (reconstructed)',
      `Connect URL: ${url}`,
      'Use: claude open <cc-url> -p "<prompt>"',
    ].join('\n') + '\n',
  )
}
