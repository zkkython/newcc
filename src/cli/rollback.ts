import {
  getLatestVersion,
  getMaxVersion,
  getVersionHistory,
  installGlobalPackage,
} from '../utils/autoUpdater.js'
import { getDoctorDiagnostic } from '../utils/doctorDiagnostic.js'
import { installOrUpdateClaudePackage } from '../utils/localInstaller.js'
import { installLatest as installLatestNative } from '../utils/nativeInstaller/index.js'

type RollbackOptions = { list?: boolean; dryRun?: boolean; safe?: boolean }

function parseOffsetTarget(target: string): number | null {
  if (!/^\d+$/.test(target.trim())) {
    return null
  }
  const n = Number.parseInt(target, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function resolveByOffset(
  history: string[],
  current: string,
  offset: number,
): string | null {
  if (history.length === 0) {
    return null
  }
  const currentIdx = history.indexOf(current)
  if (currentIdx >= 0) {
    const idx = currentIdx + offset
    return idx < history.length ? history[idx] : null
  }
  const idx = offset - 1
  return idx < history.length ? history[idx] : null
}

async function resolveRollbackVersion(
  target: string | undefined,
  opts: RollbackOptions,
): Promise<string | null> {
  if (opts.safe) {
    return (await getMaxVersion()) ?? null
  }

  if (!target || target.trim().length === 0) {
    const history = await getVersionHistory(50)
    return resolveByOffset(history, MACRO.VERSION, 1)
  }

  const offset = parseOffsetTarget(target)
  if (offset !== null) {
    const history = await getVersionHistory(100)
    return resolveByOffset(history, MACRO.VERSION, offset)
  }

  return target.trim()
}

export async function rollback(
  target?: string,
  options: RollbackOptions = {},
): Promise<void> {
  if (options.list) {
    const versions = await getVersionHistory(30)
    if (versions.length === 0) {
      process.stdout.write('No rollback version history available.\n')
      return
    }
    process.stdout.write('Recent versions (newest first):\n')
    for (const [i, version] of versions.entries()) {
      const marker = version === MACRO.VERSION ? ' (current)' : ''
      process.stdout.write(`${i + 1}. ${version}${marker}\n`)
    }
    return
  }

  const resolvedVersion = await resolveRollbackVersion(target, options)
  if (!resolvedVersion) {
    process.stderr.write('Unable to resolve rollback target version.\n')
    return
  }

  process.stdout.write(`Current version: ${MACRO.VERSION}\n`)
  process.stdout.write(`Rollback target: ${resolvedVersion}\n`)

  if (options.dryRun) {
    process.stdout.write('Dry run enabled, no installation performed.\n')
    return
  }

  const diagnostic = await getDoctorDiagnostic()
  const installType = diagnostic.installationType
  let status: 'success' | 'failed' | 'in_progress' = 'failed'

  if (installType === 'native') {
    const result = await installLatestNative(resolvedVersion, true)
    if (result.lockFailed) {
      process.stdout.write(
        `Another update process is running${result.lockHolderPid ? ` (PID ${result.lockHolderPid})` : ''}. Try again shortly.\n`,
      )
      status = 'in_progress'
    } else if (result.latestVersion) {
      status = 'success'
    }
  } else if (installType === 'npm-local') {
    const localStatus = await installOrUpdateClaudePackage(
      'latest',
      resolvedVersion,
    )
    status = localStatus === 'success' ? 'success' : localStatus
  } else {
    const globalStatus = await installGlobalPackage(resolvedVersion)
    status = globalStatus === 'install_failed' ? 'failed' : globalStatus
  }

  if (status === 'success') {
    process.stdout.write(
      `Rollback install completed. Restart Claude to use ${resolvedVersion}.\n`,
    )
    return
  }

  if (status === 'in_progress') {
    process.stdout.write('Rollback deferred because another install is active.\n')
    return
  }

  const latest = await getLatestVersion('latest')
  process.stderr.write(
    `Rollback failed for ${resolvedVersion}.${latest ? ` Latest available is ${latest}.` : ''}\n`,
  )
}
