function printDaemonHelp(): void {
  process.stdout.write(
    [
      'Claude daemon (reconstructed)',
      '',
      'Usage:',
      '  claude daemon [start|stop|status]',
      '',
      'Note: full daemon supervisor/runtime is not restored yet.',
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
      process.stdout.write(
        'Daemon start requested. Reconstructed build does not spawn a persistent supervisor yet.\n',
      )
      return
    case 'stop':
      process.stdout.write(
        'Daemon stop requested. No persistent daemon process is currently running in this build.\n',
      )
      return
    case 'status':
      process.stdout.write('Daemon status: inactive (reconstructed mode).\n')
      return
    default:
      process.stdout.write(`Unknown daemon subcommand: ${cmd}\n`)
      printDaemonHelp()
      return
  }
}
