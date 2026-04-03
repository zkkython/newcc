#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const steps = [
  {
    name: 'import-closure scan',
    cmd: ['node', 'scripts/recovery/scan-missing-imports.mjs'],
  },
  {
    name: 'bridge retry coverage',
    cmd: ['node', 'scripts/recovery/check-bridge-retry-coverage.mjs'],
  },
  {
    name: 'bridge state-machine coverage',
    cmd: ['node', 'scripts/recovery/check-bridge-state-machine-coverage.mjs'],
  },
  {
    name: 'bridge sequence coverage',
    cmd: ['node', 'scripts/recovery/check-bridge-sequence-coverage.mjs'],
  },
  {
    name: 'command surface coverage',
    cmd: ['node', 'scripts/recovery/check-command-surface-coverage.mjs'],
  },
  {
    name: 'runner remote coverage',
    cmd: ['node', 'scripts/recovery/check-runner-remote-coverage.mjs'],
  },
  {
    name: 'persistence/attribution coverage',
    cmd: ['node', 'scripts/recovery/check-persistence-attribution-coverage.mjs'],
  },
]

const bunPath = join(process.env.HOME ?? '', '.bun', 'bin', 'bun')
if (existsSync(bunPath)) {
  steps.push({
    name: 'command execution smoke (bun)',
    cmd: [bunPath, 'scripts/recovery/check-command-execution-smoke.mjs'],
    env: { ...process.env, NODE_PATH: '.' },
  })
} else {
  // tsx fallback keeps this check usable when Bun is absent.
  steps.push({
    name: 'command execution smoke (tsx fallback)',
    cmd: ['tsx', 'scripts/recovery/check-command-execution-smoke.mjs'],
  })
}

for (const step of steps) {
  console.log(`\n==> ${step.name}`)
  const res = spawnSync(step.cmd[0], step.cmd.slice(1), {
    stdio: 'inherit',
    env: step.env ?? process.env,
  })
  if (res.status !== 0) {
    console.error(`\nRecovery check failed at step: ${step.name}`)
    process.exit(res.status ?? 1)
  }
}

console.log('\nAll reconstruction recovery checks passed')
