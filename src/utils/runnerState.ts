import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { getClaudeConfigHomeDir } from './envUtils.js'

export type RunnerKind = 'environment-runner' | 'self-hosted-runner'

export type RunnerState = {
  kind: RunnerKind
  pid: number
  startedAt: string
  heartbeatAt: string
  intervalMs: number
  remoteMode?: 'local' | 'ccr-worker' | 'poll-worker'
  sessionUrl?: string
  pollUrl?: string
  workerEpoch?: number
  lastRemoteOkAt?: string
  lastRemoteError?: string
}

function getRunnerDir(kind: RunnerKind): string {
  return join(getClaudeConfigHomeDir(), 'runners', kind)
}

function getStatePath(kind: RunnerKind): string {
  return join(getRunnerDir(kind), 'state.json')
}

export async function readRunnerState(kind: RunnerKind): Promise<RunnerState | null> {
  try {
    const raw = await readFile(getStatePath(kind), 'utf-8')
    return JSON.parse(raw) as RunnerState
  } catch {
    return null
  }
}

export async function writeRunnerState(
  kind: RunnerKind,
  state: RunnerState,
): Promise<void> {
  const dir = getRunnerDir(kind)
  await mkdir(dir, { recursive: true })
  await writeFile(getStatePath(kind), JSON.stringify(state, null, 2), 'utf-8')
}

export async function clearRunnerState(kind: RunnerKind): Promise<void> {
  try {
    await rm(getStatePath(kind))
  } catch {
    // ignore
  }
}

export function isPidAlive(pid: number): boolean {
  if (!Number.isFinite(pid) || pid <= 0) {
    return false
  }
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
