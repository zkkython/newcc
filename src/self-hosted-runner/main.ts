function printSelfHostedRunnerHelp(): void {
  process.stdout.write(
    [
      'Claude self-hosted-runner (reconstructed)',
      '',
      'Usage:',
      '  claude self-hosted-runner [start|help]',
      '',
      'Note: worker registration/polling runtime is not fully restored yet.',
    ].join('\n') + '\n',
  )
}

export async function selfHostedRunnerMain(args: string[]): Promise<void> {
  const cmd = args[0]

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    printSelfHostedRunnerHelp()
    return
  }

  if (cmd === 'start') {
    process.stdout.write(
      'self-hosted-runner start requested. Reconstructed build provides CLI scaffolding only.\n',
    )
    return
  }

  process.stdout.write(`Unknown self-hosted-runner subcommand: ${cmd}\n`)
  printSelfHostedRunnerHelp()
}
