#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const file = resolve('src/bridge/remoteBridgeCore.ts')
const source = readFileSync(file, 'utf8')

const checks = [
  {
    name: 'shouldRetryInitFailure exists',
    test: /function\s+shouldRetryInitFailure\s*\(/.test(source),
  },
  {
    name: 'withRetry supports opts.shouldRetry',
    test: /async function withRetry<[^>]+>\([\s\S]*opts:\s*\{\s*shouldRetry\?:\s*\(\)\s*=>\s*boolean\s*\}\s*=\s*\{\}/.test(
      source,
    ),
  },
  {
    name: 'createCodeSession uses shouldRetry classifier',
    test: /createCodeSession[\s\S]*shouldRetry:\s*\(\)\s*=>\s*shouldRetryInitFailure\(lastCreateSessionFailure\)/.test(
      source,
    ),
  },
  {
    name: 'fetchRemoteCredentials init uses shouldRetry classifier',
    test: /fetchRemoteCredentials[\s\S]*shouldRetry:\s*\(\)\s*=>\s*shouldRetryInitFailure\(lastFetchCredsFailure\)/.test(
      source,
    ),
  },
  {
    name: 'proactive refresh uses shouldRetry classifier',
    test: /fetchRemoteCredentials \(proactive\)[\s\S]*shouldRetry:\s*\(\)\s*=>[\s\S]*shouldRetryInitFailure\(lastProactiveRefreshFailure\)/.test(
      source,
    ),
  },
  {
    name: '401 recovery uses shouldRetry classifier',
    test: /fetchRemoteCredentials \(recovery\)[\s\S]*shouldRetry:\s*\(\)\s*=>\s*shouldRetryInitFailure\(lastRecoveryFailure\)/.test(
      source,
    ),
  },
  {
    name: 'refresh failure telemetry helper exists',
    test: /function\s+logBridgeRefreshFailure\s*\(/.test(source),
  },
  {
    name: 'refresh failure telemetry event emitted',
    test: /tengu_bridge_repl_v2_refresh_stage_failed/.test(source),
  },
]

const failed = checks.filter(c => !c.test)
if (failed.length) {
  console.error('Bridge retry coverage check failed:')
  for (const f of failed) console.error(`- ${f.name}`)
  process.exit(1)
}

console.log('Bridge retry coverage check passed')
for (const c of checks) console.log(`- ${c.name}`)
