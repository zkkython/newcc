import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { getClaudeConfigHomeDir } from '../utils/envUtils.js'

export type ServerLock = {
  pid: number
  port: number
  host: string
  httpUrl: string
  startedAt: number
}

function getLockPath(): string {
  return join(getClaudeConfigHomeDir(), 'server.lock.json')
}

export async function writeServerLock(lock: ServerLock): Promise<void> {
  const path = getLockPath()
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(lock), 'utf8')
}

export async function removeServerLock(): Promise<void> {
  await rm(getLockPath(), { force: true })
}

export async function probeRunningServer(): Promise<ServerLock | null> {
  const path = getLockPath()
  let parsed: ServerLock
  try {
    parsed = JSON.parse(await readFile(path, 'utf8')) as ServerLock
  } catch {
    return null
  }

  try {
    process.kill(parsed.pid, 0)
    return parsed
  } catch {
    await removeServerLock()
    return null
  }
}
