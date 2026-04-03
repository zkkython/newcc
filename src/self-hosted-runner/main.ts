import {
  clearRunnerState,
  isPidAlive,
  readRunnerState,
  type RunnerState,
  writeRunnerState,
} from '../utils/runnerState.js'
import { registerWorker } from '../bridge/workSecret.js'

const KIND = 'self-hosted-runner' as const
const DEFAULT_INTERVAL_MS = 5000

type RemoteConfig = {
  pollUrl?: string
  sessionUrl?: string
  accessToken?: string
  registerWorker: boolean
  workerEpoch?: number
}

type RemoteRuntime = {
  mode: 'local' | 'poll-worker'
  pollUrl?: string
  sessionUrl?: string
  accessToken?: string
  workerEpoch?: number
  lastRemoteOkAt?: string
  lastRemoteError?: string
}

function printSelfHostedRunnerHelp(): void {
  process.stdout.write(
    [
      'Claude self-hosted-runner (reconstructed)',
      '',
      'Usage:',
      '  claude self-hosted-runner start [--once] [--interval-ms <n>] [--poll-url <url>]',
      '  claude self-hosted-runner status',
      '  claude self-hosted-runner stop',
      '  claude self-hosted-runner help',
      '',
      'Env:',
      '  CLAUDE_CODE_SELF_HOSTED_RUNNER_POLL_URL',
      '  CLAUDE_CODE_RUNNER_SESSION_URL',
      '  CLAUDE_CODE_SESSION_ACCESS_TOKEN',
      '  CLAUDE_CODE_WORKER_EPOCH',
      '  CLAUDE_CODE_REGISTER_WORKER=1',
    ].join('\n') + '\n',
  )
}

function parseNumberFlag(args: string[], flag: string, fallback: number): number {
  const i = args.indexOf(flag)
  if (i < 0 || i + 1 >= args.length) {
    return fallback
  }
  const parsed = Number.parseInt(args[i + 1], 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseStringFlag(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag)
  if (i < 0 || i + 1 >= args.length) {
    return undefined
  }
  const value = args[i + 1]?.trim()
  return value ? value : undefined
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function writeHeartbeat(
  intervalMs: number,
  remote: RemoteRuntime,
  startedAt?: string,
): Promise<void> {
  const now = new Date().toISOString()
  const state: RunnerState = {
    kind: KIND,
    pid: process.pid,
    startedAt: startedAt ?? now,
    heartbeatAt: now,
    intervalMs,
    remoteMode: remote.mode,
    sessionUrl: remote.sessionUrl,
    pollUrl: remote.pollUrl,
    workerEpoch: remote.workerEpoch,
    lastRemoteOkAt: remote.lastRemoteOkAt,
    lastRemoteError: remote.lastRemoteError,
  }
  await writeRunnerState(KIND, state)
}

function resolveRemoteConfig(args: string[]): RemoteConfig {
  const pollUrl =
    parseStringFlag(args, '--poll-url') ??
    process.env.CLAUDE_CODE_SELF_HOSTED_RUNNER_POLL_URL
  const sessionUrl =
    parseStringFlag(args, '--session-url') ??
    process.env.CLAUDE_CODE_RUNNER_SESSION_URL ??
    process.env.CLAUDE_CODE_SESSION_URL
  const accessToken =
    parseStringFlag(args, '--access-token') ??
    process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN
  const registerWorkerFlag =
    args.includes('--register-worker') ||
    process.env.CLAUDE_CODE_REGISTER_WORKER === '1'
  const workerEpoch =
    parseNumberFlag(
      args,
      '--worker-epoch',
      Number.parseInt(process.env.CLAUDE_CODE_WORKER_EPOCH ?? '', 10),
    ) || undefined
  return {
    pollUrl,
    sessionUrl,
    accessToken,
    registerWorker: registerWorkerFlag,
    workerEpoch,
  }
}

async function requestJson(
  url: string,
  token: string | undefined,
  body: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let lastError = 'unknown'
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        lastError = `${resp.status} ${resp.statusText}${text ? `: ${text.slice(0, 180)}` : ''}`
        // Retry on 5xx and 429 only.
        if (attempt < 2 && (resp.status >= 500 || resp.status === 429)) {
          await sleep(350 * attempt)
          continue
        }
        return {
          ok: false,
          error: lastError,
        }
      }
      return { ok: true }
    } catch (error) {
      clearTimeout(timeout)
      lastError = String(error)
      if (attempt < 2) {
        await sleep(350 * attempt)
        continue
      }
      return { ok: false, error: lastError }
    }
  }
  return { ok: false, error: lastError }
}

async function initializeRemoteRuntime(
  config: RemoteConfig,
): Promise<RemoteRuntime> {
  if (!config.pollUrl) {
    return { mode: 'local' }
  }

  let workerEpoch = config.workerEpoch
  if (
    !workerEpoch &&
    config.sessionUrl &&
    config.accessToken &&
    config.registerWorker
  ) {
    try {
      workerEpoch = await registerWorker(config.sessionUrl, config.accessToken)
      process.env.CLAUDE_CODE_WORKER_EPOCH = String(workerEpoch)
    } catch (error) {
      return {
        mode: 'poll-worker',
        pollUrl: config.pollUrl,
        sessionUrl: config.sessionUrl,
        accessToken: config.accessToken,
        lastRemoteError: `worker/register failed: ${String(error)}`,
      }
    }
  }

  return {
    mode: 'poll-worker',
    pollUrl: config.pollUrl,
    sessionUrl: config.sessionUrl,
    accessToken: config.accessToken,
    workerEpoch,
  }
}

async function tickRemote(remote: RemoteRuntime): Promise<RemoteRuntime> {
  if (remote.mode !== 'poll-worker' || !remote.pollUrl) {
    return remote
  }
  const res = await requestJson(remote.pollUrl, remote.accessToken, {
    runner_kind: KIND,
    pid: process.pid,
    worker_epoch: remote.workerEpoch,
    ts: new Date().toISOString(),
  })
  if (!res.ok) {
    return {
      ...remote,
      lastRemoteError: `poll failed: ${res.error}`,
    }
  }
  return {
    ...remote,
    lastRemoteOkAt: new Date().toISOString(),
    lastRemoteError: undefined,
  }
}

async function startRunner(args: string[]): Promise<void> {
  const intervalMs = parseNumberFlag(args, '--interval-ms', DEFAULT_INTERVAL_MS)
  const once = args.includes('--once')
  const existing = await readRunnerState(KIND)
  if (existing && isPidAlive(existing.pid) && existing.pid !== process.pid) {
    process.stdout.write(
      `self-hosted-runner already running (pid=${existing.pid}, heartbeat=${existing.heartbeatAt})\n`,
    )
    return
  }

  let remoteRuntime = await initializeRemoteRuntime(resolveRemoteConfig(args))
  await writeHeartbeat(intervalMs, remoteRuntime)
  process.stdout.write(
    `self-hosted-runner started (pid=${process.pid}, intervalMs=${intervalMs}, mode=${remoteRuntime.mode})\n`,
  )
  if (remoteRuntime.lastRemoteError) {
    process.stdout.write(`remote warning: ${remoteRuntime.lastRemoteError}\n`)
  }
  if (once) {
    remoteRuntime = await tickRemote(remoteRuntime)
    await writeHeartbeat(intervalMs, remoteRuntime)
    await clearRunnerState(KIND)
    process.stdout.write('self-hosted-runner ran one heartbeat and exited.\n')
    return
  }

  let stopping = false
  const onStop = (): void => {
    stopping = true
  }
  process.on('SIGINT', onStop)
  process.on('SIGTERM', onStop)

  const startedAt = new Date().toISOString()
  while (!stopping) {
    await sleep(intervalMs)
    remoteRuntime = await tickRemote(remoteRuntime)
    await writeHeartbeat(intervalMs, remoteRuntime, startedAt)
  }
  await clearRunnerState(KIND)
  process.stdout.write('self-hosted-runner stopped.\n')
}

async function printStatus(): Promise<void> {
  const state = await readRunnerState(KIND)
  if (!state) {
    process.stdout.write('self-hosted-runner is not running.\n')
    return
  }
  const alive = isPidAlive(state.pid)
  process.stdout.write(
    JSON.stringify(
      {
        running: alive,
        pid: state.pid,
        startedAt: state.startedAt,
        heartbeatAt: state.heartbeatAt,
        intervalMs: state.intervalMs,
        remoteMode: state.remoteMode ?? 'local',
        sessionUrl: state.sessionUrl,
        pollUrl: state.pollUrl,
        workerEpoch: state.workerEpoch,
        lastRemoteOkAt: state.lastRemoteOkAt,
        lastRemoteError: state.lastRemoteError,
      },
      null,
      2,
    ) + '\n',
  )
}

async function stopRunner(): Promise<void> {
  const state = await readRunnerState(KIND)
  if (!state) {
    process.stdout.write('self-hosted-runner is not running.\n')
    return
  }
  if (!isPidAlive(state.pid)) {
    await clearRunnerState(KIND)
    process.stdout.write('self-hosted-runner state was stale and has been cleared.\n')
    return
  }
  try {
    process.kill(state.pid, 'SIGTERM')
    process.stdout.write(`sent SIGTERM to self-hosted-runner pid=${state.pid}\n`)
  } catch (error) {
    process.stderr.write(`failed to stop self-hosted-runner: ${String(error)}\n`)
  }
}

export async function selfHostedRunnerMain(args: string[]): Promise<void> {
  const cmd = args[0]

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    printSelfHostedRunnerHelp()
    return
  }
  if (cmd === 'start') {
    await startRunner(args.slice(1))
    return
  }
  if (cmd === 'status') {
    await printStatus()
    return
  }
  if (cmd === 'stop') {
    await stopRunner()
    return
  }

  process.stdout.write(`Unknown self-hosted-runner subcommand: ${cmd}\n`)
  printSelfHostedRunnerHelp()
}
