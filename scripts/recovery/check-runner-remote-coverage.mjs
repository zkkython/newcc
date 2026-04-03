#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function read(rel) {
  return readFileSync(resolve(rel), 'utf8')
}

const envRunner = read('src/environment-runner/main.ts')
const selfRunner = read('src/self-hosted-runner/main.ts')
const runnerState = read('src/utils/runnerState.ts')

const checks = [
  {
    name: 'RunnerState includes remote fields',
    test:
      /remoteMode\?/.test(runnerState) &&
      /sessionUrl\?/.test(runnerState) &&
      /pollUrl\?/.test(runnerState) &&
      /workerEpoch\?/.test(runnerState) &&
      /lastRemoteOkAt\?/.test(runnerState) &&
      /lastRemoteError\?/.test(runnerState),
  },
  {
    name: 'environment-runner has CCR request timeout',
    test: /AbortController\(\)/.test(envRunner) && /10_000/.test(envRunner),
  },
  {
    name: 'environment-runner has request retry helper',
    test:
      /async function requestCcrJsonWithRetry\(/.test(envRunner) &&
      /attempt <= 2/.test(envRunner),
  },
  {
    name: 'environment-runner handles 409 with re-register epoch',
    test:
      /if \(!initRes\.ok && initRes\.status === 409\)/.test(envRunner) &&
      /reRegisterWorkerEpoch\(/.test(envRunner),
  },
  {
    name: 'environment-runner once mode ticks then clears state',
    test:
      /if \(once\) \{[\s\S]*tickRemote\([\s\S]*writeHeartbeat\([\s\S]*clearRunnerState\(KIND\)/.test(
        envRunner,
      ),
  },
  {
    name: 'environment-runner status prints remote diagnostics',
    test:
      /remoteMode: state\.remoteMode \?\? 'local'/.test(envRunner) &&
      /lastRemoteOkAt: state\.lastRemoteOkAt/.test(envRunner) &&
      /lastRemoteError: state\.lastRemoteError/.test(envRunner),
  },
  {
    name: 'self-hosted runner has poll timeout + retry logic',
    test:
      /AbortController\(\)/.test(selfRunner) &&
      /attempt <= 2/.test(selfRunner) &&
      /Retry on 5xx and 429 only\./.test(selfRunner),
  },
  {
    name: 'self-hosted runner supports registerWorker bootstrap',
    test:
      /registerWorker\(/.test(selfRunner) &&
      /CLAUDE_CODE_REGISTER_WORKER/.test(selfRunner),
  },
  {
    name: 'self-hosted runner once mode ticks then clears state',
    test:
      /if \(once\) \{[\s\S]*tickRemote\([\s\S]*writeHeartbeat\([\s\S]*clearRunnerState\(KIND\)/.test(
        selfRunner,
      ),
  },
  {
    name: 'self-hosted runner status prints poll/remote diagnostics',
    test:
      /remoteMode: state\.remoteMode \?\? 'local'/.test(selfRunner) &&
      /pollUrl: state\.pollUrl/.test(selfRunner) &&
      /lastRemoteOkAt: state\.lastRemoteOkAt/.test(selfRunner) &&
      /lastRemoteError: state\.lastRemoteError/.test(selfRunner),
  },
]

const failed = checks.filter(c => !c.test)
if (failed.length) {
  console.error('Runner remote coverage check failed:')
  for (const f of failed) console.error(`- ${f.name}`)
  process.exit(1)
}

console.log('Runner remote coverage check passed')
for (const c of checks) console.log(`- ${c.name}`)
