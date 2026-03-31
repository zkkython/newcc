function printTemplatesHelp(): void {
  process.stdout.write(
    [
      'Template jobs (reconstructed)',
      '',
      'Usage:',
      '  claude new',
      '  claude list',
      '  claude reply',
      '',
      'Template job backend is not fully restored yet.',
    ].join('\n') + '\n',
  )
}

export async function templatesMain(args: string[]): Promise<void> {
  const cmd = args[0]
  if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') {
    printTemplatesHelp()
    return
  }

  if (cmd === 'new' || cmd === 'list' || cmd === 'reply') {
    process.stdout.write(
      `Template subcommand "${cmd}" is currently unavailable in reconstructed mode.\n`,
    )
    return
  }

  process.stdout.write(`Unknown template subcommand: ${cmd}\n`)
  printTemplatesHelp()
}
