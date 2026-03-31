export type ServerLogger = {
  info: (message: string) => void
  warn: (message: string) => void
  error: (message: string) => void
}

export function createServerLogger(): ServerLogger {
  return {
    info(message: string): void {
      process.stderr.write(`[server] ${message}\n`)
    },
    warn(message: string): void {
      process.stderr.write(`[server:warn] ${message}\n`)
    },
    error(message: string): void {
      process.stderr.write(`[server:error] ${message}\n`)
    },
  }
}
