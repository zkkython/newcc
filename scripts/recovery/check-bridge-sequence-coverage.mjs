#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve('src/bridge/remoteBridgeCore.ts'), 'utf8')

function assertOrdered(label, needles) {
  let cursor = 0
  for (const needle of needles) {
    const idx = source.indexOf(needle, cursor)
    if (idx === -1) {
      throw new Error(`${label}: missing sequence token: ${needle}`)
    }
    cursor = idx + needle.length
  }
}

const checks = [
  () =>
    assertOrdered('401 close -> recovery path', [
      "if (code === 401 && !authRecoveryInFlight)",
      'void recoverFromAuthFailure()',
      'onStateChange?.(\'reconnecting\', \'JWT expired — refreshing\')',
      "fetchRemoteCredentials (recovery)",
      "await rebuildTransport(fresh, 'auth_401_recovery')",
    ]),
  () =>
    assertOrdered('non-401 close -> failed state', [
      'transport.setOnClose((code?: number) => {',
      "if (code === 401 && !authRecoveryInFlight)",
      'return',
      "onStateChange?.('failed', `Transport closed (code ${code})`)",
    ]),
  () =>
    assertOrdered('proactive refresh failure is classified+logged', [
      "fetchRemoteCredentials (proactive)",
      'shouldRetryInitFailure(lastProactiveRefreshFailure)',
      "logBridgeRefreshFailure(",
      "'proactive_refresh'",
    ]),
  () =>
    assertOrdered('401 recovery failure emits classified detail', [
      "logBridgeRefreshFailure('auth_401_recovery', lastRecoveryFailure)",
      "formatInitFailureDetail(lastRecoveryFailure)",
      "'JWT refresh failed after 401'",
    ]),
  () =>
    assertOrdered('rebuild ordering preserves queue semantics', [
      'flushGate.start()',
      'transport = await createV2ReplTransport({',
      'transport.connect()',
      'refresh.scheduleFromExpiresIn(sessionId, fresh.expires_in)',
      'drainFlushGate()',
      'flushGate.drop()',
    ]),
]

try {
  for (const fn of checks) fn()
  console.log('Bridge sequence coverage check passed')
  console.log('- 401 close -> recovery timeline')
  console.log('- non-401 close -> failed timeline')
  console.log('- proactive refresh failure classification')
  console.log('- 401 recovery classified failure detail')
  console.log('- rebuild queue-order invariants')
} catch (error) {
  console.error('Bridge sequence coverage check failed:')
  console.error(String(error instanceof Error ? error.message : error))
  process.exit(1)
}
