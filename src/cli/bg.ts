import { spawn } from 'child_process'
import { access, mkdir, open, readFile } from 'fs/promises'
import { join } from 'path'
import { listAllLiveSessions } from '../utils/udsClient.js'
import { errorMessage } from '../utils/errors.js'
import { execFileNoThrow } from '../utils/execFileNoThrow.js'
import { getClaudeConfigHomeDir } from '../utils/envUtils.js'

function printBgHelp(): void {
  process.stdout.write(
    [
      'Background session management (reconstructed)',
      '',
      'Usage:',
      '  claude ps',
      '  claude logs <sessionId>',
      '  claude attach <sessionId>',
      '  claude kill <sessionId>',
      '  claude --bg [args...]',
      '',
      'Notes:',
      '  - prefers tmux detached session launch when tmux is available',
      '  - falls back to detached process launch when tmux is unavailable',
    ].join('\n') + '\n',
  )
}

export async function psHandler(_args: string[]): Promise<void> {
  const peers = await listAllLiveSessions()
  if (peers.length === 0) {
    process.stdout.write('No live background-compatible sessions found.\n')
    return
  }
  process.stdout.write('PID\tSESSION\tKIND\tSTATUS\tCWD\n')
  for (const peer of peers) {
    process.stdout.write(
      `${peer.pid ?? '-'}\t${peer.sessionId ?? peer.bridgeSessionId ?? '-'}\t${peer.kind ?? '-'}\t${peer.status ?? '-'}\t${peer.cwd ?? '-'}\n`,
    )
  }
}

export async function logsHandler(sessionId?: string): Promise<void> {
  if (!sessionId) {
    printBgHelp()
    return
  }
  const peers = await listAllLiveSessions()
  const target = peers.find(
    peer =>
      String(peer.pid ?? '') === sessionId ||
      peer.sessionId === sessionId ||
      peer.bridgeSessionId === sessionId,
  )
  if (!target) {
    process.stdout.write(`No live session found for: ${sessionId}\n`)
    return
  }
  if (!target.logPath) {
    process.stdout.write(
      `No log path is registered for session: ${sessionId}\n`,
    )
    return
  }
  try {
    await access(target.logPath)
    const raw = await readFile(target.logPath, 'utf8')
    const lines = raw.split(/\r?\n/)
    const tail = lines.slice(Math.max(0, lines.length - 200)).join('\n')
    process.stdout.write(tail + (tail.endsWith('\n') ? '' : '\n'))
  } catch (error) {
    process.stdout.write(
      `Failed to read logs for ${sessionId}: ${errorMessage(error)}\n`,
    )
  }
}

export async function attachHandler(sessionId?: string): Promise<void> {
  if (!sessionId) {
    printBgHelp()
    return
  }
  const peers = await listAllLiveSessions()
  const target = peers.find(
    peer =>
      String(peer.pid ?? '') === sessionId ||
      peer.sessionId === sessionId ||
      peer.bridgeSessionId === sessionId,
  )
  if (!target) {
    process.stdout.write(`No live session found for: ${sessionId}\n`)
    return
  }

  if (!target.name) {
    process.stdout.write(
      `Session ${sessionId} has no attachable tmux session name.\n`,
    )
    return
  }

  const tmuxCheck = await execFileNoThrow('tmux', ['-V'], { useCwd: false })
  if (tmuxCheck.code !== 0) {
    process.stdout.write('tmux is not available on this machine.\n')
    return
  }

  const tmuxSessionName = target.name
  await new Promise<void>(resolve => {
    const child = spawn('tmux', ['attach-session', '-t', tmuxSessionName], {
      stdio: 'inherit',
    })
    child.once('error', error => {
      process.stdout.write(`Failed to attach: ${errorMessage(error)}\n`)
      resolve()
    })
    child.once('exit', () => resolve())
  })
}

export async function killHandler(sessionId?: string): Promise<void> {
  if (!sessionId) {
    printBgHelp()
    return
  }

  const peers = await listAllLiveSessions()
  const target = peers.find(
    peer =>
      String(peer.pid ?? '') === sessionId ||
      peer.sessionId === sessionId ||
      peer.bridgeSessionId === sessionId,
  )
  if (!target?.pid) {
    process.stdout.write(`No live session found for: ${sessionId}\n`)
    return
  }
  try {
    process.kill(target.pid, 'SIGTERM')
    process.stdout.write(`Sent SIGTERM to pid ${target.pid}\n`)
  } catch (error) {
    process.stdout.write(
      `Failed to terminate ${sessionId}: ${errorMessage(error)}\n`,
    )
  }
}

export async function handleBgFlag(args: string[]): Promise<void> {
  const filteredArgs = args.filter(a => a !== '--bg' && a !== '--background')
  const now = new Date()
  const stamp = now.toISOString().replace(/[:.]/g, '-')
  const logsDir = join(getClaudeConfigHomeDir(), 'bg-logs')
  await mkdir(logsDir, { recursive: true })
  const logPath = join(logsDir, `bg-${stamp}-${Math.random().toString(36).slice(2, 8)}.log`)
  const sessionName = `claude-bg-${stamp.slice(0, 19)}-${Math.random().toString(36).slice(2, 6)}`
  const bgEnv = {
    ...process.env,
    CLAUDE_CODE_SESSION_KIND: 'bg',
    CLAUDE_CODE_SESSION_NAME: sessionName,
    CLAUDE_CODE_SESSION_LOG: logPath,
  }

  const childArgs = resolveBgChildArgs(filteredArgs)
  if (childArgs.length === 0) {
    process.stderr.write('Unable to resolve background launch args.\n')
    return
  }

  const tmuxCheck = await execFileNoThrow('tmux', ['-V'], { useCwd: false })
  if (tmuxCheck.code === 0) {
    const start = await execFileNoThrow(
      'tmux',
      ['new-session', '-d', '-s', sessionName, '-c', process.cwd(), '--', process.execPath, ...childArgs],
      { env: bgEnv },
    )
    if (start.code === 0) {
      const pipeCmd = `cat >> ${quoteForShell(logPath)}`
      await execFileNoThrow('tmux', ['pipe-pane', '-o', '-t', sessionName, pipeCmd], {
        env: bgEnv,
      })
      process.stdout.write(
        `Started background tmux session ${sessionName}\n` +
          `Args: ${filteredArgs.join(' ') || '(none)'}\n` +
          `Logs: ${logPath}\n` +
          `Use: claude attach ${sessionName}\n`,
      )
      return
    }
    process.stdout.write(
      `tmux launch failed (${start.stderr?.trim() || `exit ${start.code}`}), falling back to detached mode.\n`,
    )
  }

  const logFile = await open(logPath, 'a')
  try {
    const child = spawn(process.execPath, childArgs, {
      detached: true,
      stdio: ['ignore', logFile.fd, logFile.fd],
      env: bgEnv,
      cwd: process.cwd(),
    })
    child.unref()
    process.stdout.write(
      `Started detached background process (pid ${child.pid ?? 'unknown'})\n` +
        `Args: ${filteredArgs.join(' ') || '(none)'}\n` +
        `Logs: ${logPath}\n`,
    )
  } catch (error) {
    process.stderr.write(`Failed to start background process: ${errorMessage(error)}\n`)
  } finally {
    await logFile.close().catch(() => {})
  }
}

function resolveBgChildArgs(filteredArgs: string[]): string[] {
  // Dev/reconstructed tree: invoke the same JS entrypoint under node.
  if (process.argv[1]) {
    return [process.argv[1], ...filteredArgs]
  }
  // Packaged binary: pass CLI args directly.
  return [...filteredArgs]
}

function quoteForShell(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}
