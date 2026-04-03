#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const file = resolve('src/bridge/remoteBridgeCore.ts')
const source = readFileSync(file, 'utf8')

const checks = [
  {
    name: 'onClose has 401 recovery branch',
    test: /transport\.setOnClose\([\s\S]*if \(code === 401 && !authRecoveryInFlight\) \{[\s\S]*recoverFromAuthFailure\(\)[\s\S]*return/.test(
      source,
    ),
  },
  {
    name: 'onClose has non-401 failure state transition',
    test: /transport\.setOnClose\([\s\S]*onStateChange\?\.\('failed', `Transport closed \(code \$\{code\}\)`\)/.test(
      source,
    ),
  },
  {
    name: 'rebuildTransport starts flushGate before replacing transport',
    test: /async function rebuildTransport[\s\S]*flushGate\.start\(\)[\s\S]*transport = await createV2ReplTransport\(/.test(
      source,
    ),
  },
  {
    name: 'rebuildTransport re-schedules token refresh after connect',
    test: /async function rebuildTransport[\s\S]*transport\.connect\(\)[\s\S]*refresh\.scheduleFromExpiresIn\(sessionId, fresh\.expires_in\)/.test(
      source,
    ),
  },
  {
    name: 'rebuildTransport drains queued writes and drops gate in finally',
    test: /async function rebuildTransport[\s\S]*drainFlushGate\(\)[\s\S]*finally \{[\s\S]*flushGate\.drop\(\)/.test(
      source,
    ),
  },
  {
    name: 'recoverFromAuthFailure emits reconnecting state before refresh attempt',
    test: /async function recoverFromAuthFailure[\s\S]*onStateChange\?\.\('reconnecting', 'JWT expired — refreshing'\)/.test(
      source,
    ),
  },
  {
    name: 'recoverFromAuthFailure resets initialFlushDone before rebuild',
    test: /async function recoverFromAuthFailure[\s\S]*initialFlushDone = false[\s\S]*await rebuildTransport\(fresh, 'auth_401_recovery'\)/.test(
      source,
    ),
  },
  {
    name: 'connect timeout telemetry exists for started-silence gap',
    test: /function onConnectTimeout\([\s\S]*logEvent\('tengu_bridge_repl_connect_timeout'/.test(
      source,
    ),
  },
]

const failed = checks.filter(c => !c.test)
if (failed.length) {
  console.error('Bridge state-machine coverage check failed:')
  for (const f of failed) console.error(`- ${f.name}`)
  process.exit(1)
}

console.log('Bridge state-machine coverage check passed')
for (const c of checks) console.log(`- ${c.name}`)
