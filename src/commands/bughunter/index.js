import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { getCwd } from '../../utils/cwd.js'
import { execFileNoThrow } from '../../utils/execFileNoThrow.js'

function timestampForFilename() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

const call = async args => {
  const focus = args.trim() || 'general'
  const cwd = getCwd()

  const [gitBranch, gitStatus, recentCommits] = await Promise.all([
    execFileNoThrow('git', ['rev-parse', '--abbrev-ref', 'HEAD']),
    execFileNoThrow('git', ['status', '--short']),
    execFileNoThrow('git', ['log', '--oneline', '-n', '8']),
  ])

  const outDir = join(cwd, '.claude', 'bughunter')
  await mkdir(outDir, { recursive: true })
  const outPath = join(outDir, `bughunt-${timestampForFilename()}.md`)

  const report = [
    '# Bughunter Snapshot',
    '',
    `Focus: ${focus}`,
    `CWD: ${cwd}`,
    '',
    '## Git Branch',
    gitBranch.stdout.trim() || '(unknown)',
    '',
    '## Git Status',
    (gitStatus.stdout || gitStatus.stderr || '(clean)').trim(),
    '',
    '## Recent Commits',
    (recentCommits.stdout || recentCommits.stderr || '(none)').trim(),
    '',
    '## Next Steps',
    '1. Reproduce the bug with exact commands.',
    '2. Narrow candidate files/functions.',
    '3. Add minimal regression coverage.',
    '4. Patch and verify.',
    '',
  ].join('\n')

  await writeFile(outPath, report, 'utf-8')

  return {
    type: 'text',
    value: `Created bughunter snapshot: ${outPath}`,
  }
}

export default {
  type: 'local',
  name: 'bughunter',
  description: 'Create a local bug triage snapshot',
  isHidden: true,
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
}

