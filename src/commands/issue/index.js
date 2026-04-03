import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { getCwd } from '../../utils/cwd.js'

function timestampForFilename() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

const call = async args => {
  const title = args.trim() || 'Untitled issue'
  const issueDir = join(getCwd(), '.claude', 'issues')
  await mkdir(issueDir, { recursive: true })
  const filePath = join(issueDir, `issue-${timestampForFilename()}.md`)
  const body = [
    `# ${title}`,
    '',
    '## Summary',
    '',
    '## Reproduction',
    '',
    '## Expected',
    '',
    '## Actual',
    '',
    '## Notes',
    '',
  ].join('\n')
  await writeFile(filePath, body, 'utf-8')

  return {
    type: 'text',
    value: `Created issue draft at ${filePath}`,
  }
}

export default {
  type: 'local',
  name: 'issue',
  description: 'Create a local issue draft in .claude/issues',
  isHidden: true,
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
}

