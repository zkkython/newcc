import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { getCwd } from '../../utils/cwd.js'

function timestampForFilename() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

const call = async args => {
  const title = args.trim() || 'Performance issue'
  const issueDir = join(getCwd(), '.claude', 'issues')
  await mkdir(issueDir, { recursive: true })
  const filePath = join(issueDir, `perf-issue-${timestampForFilename()}.md`)
  const body = [
    `# ${title}`,
    '',
    '## Symptom',
    '',
    '## Scope',
    '',
    '## Reproduction',
    '',
    '## Metrics',
    '- latency:',
    '- throughput:',
    '- memory:',
    '',
    '## Suspected Root Cause',
    '',
    '## Next Actions',
    '',
  ].join('\n')
  await writeFile(filePath, body, 'utf-8')

  return {
    type: 'text',
    value: `Created performance issue draft at ${filePath}`,
  }
}

export default {
  type: 'local',
  name: 'perf-issue',
  description: 'Create a local performance issue draft in .claude/issues',
  isHidden: true,
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
}

