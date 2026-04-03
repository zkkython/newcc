import { execFileNoThrow } from '../../utils/execFileNoThrow.js'
import { getCwd } from '../../utils/cwd.js'

const call = async () => {
  const cwd = getCwd()

  const [gitStatus, gitBranch, scan] = await Promise.all([
    execFileNoThrow('git', ['status', '--short']),
    execFileNoThrow('git', ['rev-parse', '--abbrev-ref', 'HEAD']),
    execFileNoThrow('node', ['scripts/recovery/scan-missing-imports.mjs'], {
      cwd,
    }),
  ])

  const lines = [
    'good-claude quick checks (reconstructed)',
    '',
    `cwd: ${cwd}`,
    `branch: ${(gitBranch.stdout || gitBranch.stderr || 'unknown').trim()}`,
    '',
    'git status:',
    (gitStatus.stdout || gitStatus.stderr || '(clean)').trim(),
    '',
    'recovery scan:',
    (scan.stdout || scan.stderr || '(no output)').trim(),
  ]

  return {
    type: 'text',
    value: lines.join('\n'),
  }
}

export default {
  type: 'local',
  name: 'good-claude',
  description: 'Run quick local health checks for reconstructed workspace',
  isHidden: true,
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
}

