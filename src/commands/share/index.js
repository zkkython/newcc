import { access, mkdir, writeFile } from 'fs/promises'
import { randomUUID } from 'crypto'
import { join } from 'path'
import { getSessionId } from '../../bootstrap/state.js'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'
import { getTranscriptPath } from '../../utils/sessionStorage.js'
import { submitTranscriptShare } from '../../components/FeedbackSurvey/submitTranscriptShare.js'

const call = async (_args, context) => {
  const sessionId = getSessionId()
  const transcriptPath = getTranscriptPath()
  let transcriptExists = true
  try {
    await access(transcriptPath)
  } catch {
    transcriptExists = false
  }

  const shareId = `local_${randomUUID().replace(/-/g, '').slice(0, 16)}`
  const sharesDir = join(getClaudeConfigHomeDir(), 'shares')
  const outPath = join(sharesDir, `${shareId}.json`)
  await mkdir(sharesDir, { recursive: true })

  const payload = {
    shareId,
    sessionId,
    createdAt: new Date().toISOString(),
    transcriptPath,
    transcriptExists,
    mode: 'local-reconstructed-share',
  }
  await writeFile(outPath, JSON.stringify(payload, null, 2), 'utf-8')

  // Try remote transcript sharing first; if it fails, keep local manifest as fallback.
  const maybeMessages = Array.isArray(context?.messages) ? context.messages : []
  if (maybeMessages.length > 0) {
    const remote = await submitTranscriptShare(
      maybeMessages,
      'frustration',
      randomUUID(),
    )
    if (remote.success) {
      return {
        type: 'text',
        value: [
          `Shared transcript successfully${remote.transcriptId ? ` (id: ${remote.transcriptId})` : ''}.`,
          `Local manifest: ${outPath}`,
        ].join('\n'),
      }
    }
  }

  return {
    type: 'text',
    value: [
      `Created local share manifest: ${shareId}`,
      `Path: ${outPath}`,
      transcriptExists
        ? `Transcript: ${transcriptPath}`
        : 'Transcript file is not on disk yet; re-run after more conversation turns.',
    ].join('\n'),
  }
}

export default {
  type: 'local',
  name: 'share',
  description: 'Create a local share manifest for the current conversation',
  isHidden: true,
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
}
