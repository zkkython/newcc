function printWorkerHelp(): void {
  process.stderr.write(
    [
      'Daemon worker runner (reconstructed)',
      'Usage: claude --daemon-worker <kind>',
      'Known kinds: assistant, default',
    ].join('\n') + '\n',
  )
}

export async function runDaemonWorker(kind?: string): Promise<void> {
  if (!kind || kind === 'help' || kind === '--help' || kind === '-h') {
    printWorkerHelp()
    return
  }

  switch (kind) {
    case 'assistant':
    case 'default':
      process.stdout.write(
        `Daemon worker "${kind}" started in reconstructed compatibility mode.\n`,
      )
      return
    default:
      process.stderr.write(`Unknown daemon worker kind: ${kind}\n`)
      printWorkerHelp()
      return
  }
}
