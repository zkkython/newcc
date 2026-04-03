import type { DiagLogger } from '@opentelemetry/api'
import { logForDebugging } from '../debug.js'
import { logError } from '../log.js'

function isExpectedTelemetryExportRejection(message: string): boolean {
  return (
    message.includes('Failed to export') &&
    (message.includes('status=401') ||
      message.includes('status=403') ||
      message.includes('code=ERR_BAD_REQUEST') ||
      message.includes('code=FailedToOpenSocket'))
  )
}
export class ClaudeCodeDiagLogger implements DiagLogger {
  error(message: string, ..._: unknown[]) {
    const isExpected = isExpectedTelemetryExportRejection(message)
    if (!isExpected) {
      logError(new Error(message))
    }
    logForDebugging(
      `[3P telemetry] OTEL diag error: ${message}`,
      { level: isExpected ? 'debug' : 'error' },
    )
  }
  warn(message: string, ..._: unknown[]) {
    logError(new Error(message))
    logForDebugging(`[3P telemetry] OTEL diag warn: ${message}`, {
      level: 'warn',
    })
  }
  info(_message: string, ..._args: unknown[]) {
    return
  }
  debug(_message: string, ..._args: unknown[]) {
    return
  }
  verbose(_message: string, ..._args: unknown[]) {
    return
  }
}
