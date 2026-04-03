import { spawn } from 'child_process'
import { probeRunningServer, removeServerLock } from '../server/lockfile.js'

function printDaemonHelp(): void {
  process.stdout.write(
    [
      'Claude daemon (reconstructed)',
      '',
      'Usage:',
      '  claude daemon [start|stop|status]',
    ].join('\n') + '\n',
  )
}

export async function daemonMain(args: string[]): Promise<void> {
  const cmd = args[0]

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    printDaemonHelp()
    return
  }

  switch (cmd) {
    case 'start':
      {
        const running = await probeRunningServer()
        if (running) {
          process.stdout.write(
            `Daemon already active (pid ${running.pid}, url ${running.httpUrl}).\n`,
          )
          return
        }

        const child = spawn(
          process.execPath,
          resolveServerStartArgs(),
          {
            detached: true,
            stdio: 'ignore',
            env: {
              ...process.env,
              CLAUDE_CODE_SESSION_KIND: 'daemon',
            },
          },
        )
        child.unref()

        const started = await waitForServerLock(4_000)
        if (!started) {
          process.stdout.write(
            `Daemon start requested (spawned pid ${child.pid ?? 'unknown'}), but no server lock was observed yet.\n`,
          )
          return
        }
        process.stdout.write(
          `Daemon started (pid ${started.pid}, url ${started.httpUrl}).\n`,
        )
      }
      return
    case 'stop':
      {
        const running = await probeRunningServer()
        if (!running) {
          process.stdout.write('Daemon stop requested. No running server.\n')
          return
        }
        try {
          process.kill(running.pid, 'SIGTERM')
        } catch {
          // process already gone
        }
        await removeServerLock()
        process.stdout.write(
          `Daemon stop requested. Sent SIGTERM to pid ${running.pid}.\n`,
        )
      }
      return
    case 'status':
      {
        const running = await probeRunningServer()
        if (!running) {
          process.stdout.write('Daemon status: inactive.\n')
          return
        }
        process.stdout.write(
          `Daemon status: active (pid ${running.pid}, url ${running.httpUrl}).\n`,
        )
      }
      return
    default:
      process.stdout.write(`Unknown daemon subcommand: ${cmd}\n`)
      printDaemonHelp()
      return
  }
}

function resolveServerStartArgs(): string[] {
  // Running as `node dist/entrypoints/cli.js` (dev/reconstructed tree)
  if (process.argv[1]) {
    return [process.argv[1], 'server']
  }
  // Running as packaged single executable
  return ['server']
}

async function waitForServerLock(timeoutMs: number) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const running = await probeRunningServer()
    if (running) {
      return running
    }
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  return null
}
