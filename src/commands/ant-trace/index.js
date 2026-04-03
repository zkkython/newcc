import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { getSessionId } from '../../bootstrap/state.js'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'
import { getLastAPIRequest, getLastClassifierRequests } from '../../bootstrap/state.js'

function ts() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

const call = async args => {
  const note = args.trim()
  const outDir = join(getClaudeConfigHomeDir(), 'traces')
  await mkdir(outDir, { recursive: true })
  const outPath = join(outDir, `ant-trace-${ts()}.json`)

  const payload = {
    createdAt: new Date().toISOString(),
    sessionId: getSessionId(),
    pid: process.pid,
    userType: process.env.USER_TYPE ?? 'external',
    note: note || undefined,
    lastApiRequest: getLastAPIRequest(),
    lastClassifierRequests: getLastClassifierRequests(),
  }
  await writeFile(outPath, JSON.stringify(payload, null, 2), 'utf-8')

  return {
    type: 'text',
    value: `Wrote trace snapshot: ${outPath}`,
  }
}

export default {
  type: 'local',
  name: 'ant-trace',
  description: 'Write an internal trace snapshot to ~/.claude/traces',
  isHidden: true,
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
}

