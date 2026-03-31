function printEnvironmentRunnerHelp(): void {
  process.stdout.write(
    [
      'Claude environment-runner (reconstructed)',
      '',
      'Usage:',
      '  claude environment-runner [start|help]',
      '',
      'Note: BYOC headless runner protocol is not fully restored yet.',
    ].join('\n') + '\n',
  )
}

export async function environmentRunnerMain(args: string[]): Promise<void> {
  const cmd = args[0]

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    printEnvironmentRunnerHelp()
    return
  }

  if (cmd === 'start') {
    process.stdout.write(
      'environment-runner start requested. Reconstructed build provides CLI scaffolding only.\n',
    )
    return
  }

  process.stdout.write(`Unknown environment-runner subcommand: ${cmd}\n`)
  printEnvironmentRunnerHelp()
}
