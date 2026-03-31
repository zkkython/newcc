export async function rollback(
  target?: string,
  _options?: { list?: boolean; dryRun?: boolean; safe?: boolean },
): Promise<void> {
  process.stdout.write(
    `Rollback is unavailable in reconstructed mode${target ? ` (requested target: ${target})` : ''}.\n`,
  )
}
