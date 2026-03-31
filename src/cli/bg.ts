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
      'Note: full daemon-backed bg session orchestration is not restored yet.',
    ].join('\n') + '\n',
  )
}

export async function psHandler(_args: string[]): Promise<void> {
  process.stdout.write(
    'No background sessions are currently tracked in this reconstructed build.\n',
  )
}

export async function logsHandler(sessionId?: string): Promise<void> {
  if (!sessionId) {
    printBgHelp()
    return
  }
  process.stdout.write(
    `Background log streaming is not available yet for session: ${sessionId}\n`,
  )
}

export async function attachHandler(sessionId?: string): Promise<void> {
  if (!sessionId) {
    printBgHelp()
    return
  }
  process.stdout.write(
    `Background attach is not available yet for session: ${sessionId}\n`,
  )
}

export async function killHandler(sessionId?: string): Promise<void> {
  if (!sessionId) {
    printBgHelp()
    return
  }
  process.stdout.write(
    `Background kill is not available yet for session: ${sessionId}\n`,
  )
}

export async function handleBgFlag(args: string[]): Promise<void> {
  const filteredArgs = args.filter(a => a !== '--bg' && a !== '--background')
  process.stdout.write(
    `Background execution flag detected for args: ${filteredArgs.join(' ') || '(none)'}\n` +
      'This reconstructed build currently runs in foreground mode only.\n',
  )
}
