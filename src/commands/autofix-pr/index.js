import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { getCwd } from '../../utils/cwd.js'

function timestampForFilename() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

const call = async args => {
  const target = args.trim()
  if (!target) {
    return {
      type: 'text',
      value: 'Usage: /autofix-pr <PR number or URL>',
    }
  }

  const outDir = join(getCwd(), '.claude', 'autofix-pr')
  await mkdir(outDir, { recursive: true })
  const planPath = join(outDir, `autofix-${timestampForFilename()}.md`)
  const content = [
    '# Autofix PR Plan',
    '',
    `Target: ${target}`,
    '',
    '## Review Checklist',
    '1. Reproduce failing checks locally.',
    '2. Identify minimal patch to fix failure.',
    '3. Run targeted tests and linters.',
    '4. Summarize risk and verification evidence.',
    '',
    '## Execution Notes',
    '',
  ].join('\n')
  await writeFile(planPath, content, 'utf-8')

  return {
    type: 'text',
    value: [
      `Prepared autofix plan for ${target}`,
      `Plan file: ${planPath}`,
      'Next: apply fixes, run verification, and update the PR.',
    ].join('\n'),
  }
}

export default {
  type: 'local',
  name: 'autofix-pr',
  description: 'Prepare a local autofix plan for a target PR',
  isHidden: true,
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
}

