import {
  clearRunnerState,
  isPidAlive,
  readRunnerState,
  type RunnerState,
  writeRunnerState,
} from '../utils/runnerState.js'
import { registerWorker } from '../bridge/workSecret.js'

const KIND = 'environment-runner' as const
const DEFAULT_INTERVAL_MS = 5000

type RemoteConfig = {
  sessionUrl?: string
  accessToken?: string
  registerWorker: boolean
  workerEpoch?: number
}

type RemoteRuntime = {
  mode: 'local' | 'ccr-worker'
  sessionUrl?: string
  accessToken?: string
  workerEpoch?: number
  lastRemoteOkAt?: string
  lastRemoteError?: string
}

type CcrRequestResult =
  | { ok: true }
  | { ok: false; error: string; status?: number }

function printEnvironmentRunnerHelp(): void {
  process.stdout.write(
    [
      'Claude environment-runner (reconstructed)',
      '',
      'Usage:',
      '  claude environment-runner start [--once] [--interval-ms <n>] [--session-url <url>] [--register-worker]',
      '  claude environment-runner status',
      '  claude environment-runner stop',
      '  claude environment-runner help',
      '',
      'Env:',
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
    workerEpoch: remote.workerEpoch,
    lastRemoteOkAt: remote.lastRemoteOkAt,
    lastRemoteError: remote.lastRemoteError,
  }
  await writeRunnerState(KIND, state)
}

function resolveRemoteConfig(args: string[]): RemoteConfig {
  const envSessionUrl =
    process.env.CLAUDE_CODE_RUNNER_SESSION_URL ??
    process.env.CLAUDE_CODE_SESSION_URL
  const sessionUrl = parseStringFlag(args, '--session-url') ?? envSessionUrl
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
    sessionUrl,
    accessToken,
    registerWorker: registerWorkerFlag,
    workerEpoch,
  }
}

function getSessionIdFromSessionUrl(sessionUrl: string): string {
  try {
    const url = new URL(sessionUrl)
    const id = url.pathname.split('/').filter(Boolean).at(-1)
    return id ?? ''
  } catch {
    return ''
  }
}

async function requestCcrJson(
  method: 'PUT' | 'POST',
  url: string,
  token: string,
  body: Record<string, unknown>,
): Promise<CcrRequestResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const resp = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      return {
        ok: false,
        status: resp.status,
        error: `${resp.status} ${resp.statusText}${text ? `: ${text.slice(0, 180)}` : ''}`,
      }
    }
    return { ok: true }
  } catch (error) {
    clearTimeout(timeout)
    return { ok: false, error: String(error) }
  }
}

async function requestCcrJsonWithRetry(
  method: 'PUT' | 'POST',
  url: string,
  token: string,
  body: Record<string, unknown>,
): Promise<CcrRequestResult> {
  let last: CcrRequestResult = { ok: false, error: 'unknown' }
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    last = await requestCcrJson(method, url, token, body)
    if (last.ok) return last
    // Don't hide epoch/auth errors behind retries.
    if (
      last.status === 401 ||
      last.status === 403 ||
      last.status === 409 ||
      (last.status !== undefined && last.status < 500 && last.status !== 429)
    ) {
      return last
    }
    if (attempt < 2) {
      await sleep(350 * attempt)
    }
  }
  return last
}

async function reRegisterWorkerEpoch(
  runtime: RemoteRuntime,
): Promise<{ runtime: RemoteRuntime; ok: boolean; error?: string }> {
  if (!runtime.sessionUrl || !runtime.accessToken) {
    return { runtime, ok: false, error: 'missing sessionUrl/accessToken' }
  }
  try {
    const workerEpoch = await registerWorker(
      runtime.sessionUrl,
      runtime.accessToken,
    )
    process.env.CLAUDE_CODE_WORKER_EPOCH = String(workerEpoch)
    return {
      runtime: {
        ...runtime,
        workerEpoch,
        lastRemoteError: undefined,
      },
      ok: true,
    }
  } catch (error) {
    return {
      runtime,
      ok: false,
      error: String(error),
    }
  }
}

async function initializeRemoteRuntime(
  config: RemoteConfig,
): Promise<RemoteRuntime> {
  if (!config.sessionUrl || !config.accessToken) {
    return { mode: 'local' }
  }
  let workerEpoch = config.workerEpoch
  if (!workerEpoch && config.registerWorker) {
    try {
      workerEpoch = await registerWorker(config.sessionUrl, config.accessToken)
      process.env.CLAUDE_CODE_WORKER_EPOCH = String(workerEpoch)
    } catch (error) {
      return {
        mode: 'ccr-worker',
        sessionUrl: config.sessionUrl,
        accessToken: config.accessToken,
        lastRemoteError: `worker/register failed: ${String(error)}`,
      }
    }
  }

  const runtime: RemoteRuntime = {
    mode: 'ccr-worker',
    sessionUrl: config.sessionUrl,
    accessToken: config.accessToken,
    workerEpoch,
  }
  if (!workerEpoch) {
    return {
      ...runtime,
      lastRemoteError:
        'missing worker epoch (set --worker-epoch or CLAUDE_CODE_WORKER_EPOCH, or enable --register-worker)',
    }
  }

  let initRes = await requestCcrJsonWithRetry(
    'PUT',
    `${config.sessionUrl}/worker`,
    config.accessToken,
    {
      worker_epoch: workerEpoch,
      worker_status: 'idle',
      external_metadata: {
        runner_kind: KIND,
        pid: process.pid,
      },
    },
  )
  if (!initRes.ok && initRes.status === 409) {
    const rr = await reRegisterWorkerEpoch(runtime)
    if (rr.ok && rr.runtime.workerEpoch) {
      initRes = await requestCcrJsonWithRetry(
        'PUT',
        `${config.sessionUrl}/worker`,
        config.accessToken,
        {
          worker_epoch: rr.runtime.workerEpoch,
          worker_status: 'idle',
          external_metadata: {
            runner_kind: KIND,
            pid: process.pid,
          },
        },
      )
      if (initRes.ok) {
        return {
          ...rr.runtime,
          lastRemoteOkAt: new Date().toISOString(),
        }
      }
    }
  }
  if (!initRes.ok) {
    return {
      ...runtime,
      lastRemoteError: `worker init failed: ${initRes.error}`,
    }
  }
  return {
    ...runtime,
    lastRemoteOkAt: new Date().toISOString(),
  }
}

async function tickRemote(runtime: RemoteRuntime): Promise<RemoteRuntime> {
  if (
    runtime.mode !== 'ccr-worker' ||
    !runtime.sessionUrl ||
    !runtime.accessToken ||
    !runtime.workerEpoch
  ) {
    return runtime
  }
  const sessionId = getSessionIdFromSessionUrl(runtime.sessionUrl)
  let res = await requestCcrJsonWithRetry(
    'POST',
    `${runtime.sessionUrl}/worker/heartbeat`,
    runtime.accessToken,
    {
      worker_epoch: runtime.workerEpoch,
      session_id: sessionId,
    },
  )
  if (!res.ok && res.status === 409) {
    const rr = await reRegisterWorkerEpoch(runtime)
    if (!rr.ok || !rr.runtime.workerEpoch) {
      return {
        ...runtime,
        lastRemoteError: `epoch re-register failed: ${rr.error ?? 'unknown'}`,
      }
    }
    res = await requestCcrJsonWithRetry(
      'POST',
      `${runtime.sessionUrl}/worker/heartbeat`,
      runtime.accessToken,
      {
        worker_epoch: rr.runtime.workerEpoch,
        session_id: sessionId,
      },
    )
    if (res.ok) {
      return {
        ...rr.runtime,
        lastRemoteOkAt: new Date().toISOString(),
        lastRemoteError: undefined,
      }
    }
    return {
      ...rr.runtime,
      lastRemoteError: `heartbeat failed after epoch refresh: ${res.error}`,
    }
  }
  if (!res.ok) {
    return {
      ...runtime,
      lastRemoteError: `heartbeat failed: ${res.error}`,
    }
  }
  return {
    ...runtime,
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
      `environment-runner already running (pid=${existing.pid}, heartbeat=${existing.heartbeatAt})\n`,
    )
    return
  }

  let remoteRuntime = await initializeRemoteRuntime(resolveRemoteConfig(args))
  await writeHeartbeat(intervalMs, remoteRuntime)
  process.stdout.write(
    `environment-runner started (pid=${process.pid}, intervalMs=${intervalMs}, mode=${remoteRuntime.mode})\n`,
  )
  if (remoteRuntime.lastRemoteError) {
    process.stdout.write(`remote warning: ${remoteRuntime.lastRemoteError}\n`)
  }
  if (once) {
    remoteRuntime = await tickRemote(remoteRuntime)
    await writeHeartbeat(intervalMs, remoteRuntime)
    await clearRunnerState(KIND)
    process.stdout.write('environment-runner ran one heartbeat and exited.\n')
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
  process.stdout.write('environment-runner stopped.\n')
}

async function printStatus(): Promise<void> {
  const state = await readRunnerState(KIND)
  if (!state) {
    process.stdout.write('environment-runner is not running.\n')
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
    process.stdout.write('environment-runner is not running.\n')
    return
  }
  if (!isPidAlive(state.pid)) {
    await clearRunnerState(KIND)
    process.stdout.write('environment-runner state was stale and has been cleared.\n')
    return
  }
  try {
    process.kill(state.pid, 'SIGTERM')
    process.stdout.write(`sent SIGTERM to environment-runner pid=${state.pid}\n`)
  } catch (error) {
    process.stderr.write(`failed to stop environment-runner: ${String(error)}\n`)
  }
}

export async function environmentRunnerMain(args: string[]): Promise<void> {
  const cmd = args[0]

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    printEnvironmentRunnerHelp()
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

  process.stdout.write(`Unknown environment-runner subcommand: ${cmd}\n`)
  printEnvironmentRunnerHelp()
}
