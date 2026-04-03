#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function read(rel) {
  return readFileSync(resolve(rel), 'utf8')
}

const transcript = read('src/services/sessionTranscript/sessionTranscript.ts')
const uploader = read('src/utils/sessionDataUploader.ts')
const summary = read('src/utils/taskSummary.ts')
const attribution = read('src/utils/postCommitAttribution.ts')
const attributionHooks = read('src/utils/attributionHooks.ts')

const checks = [
  {
    name: 'session transcript writes local JSONL snapshots',
    test:
      /~\.claude\/kairos\/transcripts/.test(transcript) ||
      /join\(getClaudeConfigHomeDir\(\), 'kairos', 'transcripts'\)/.test(
        transcript,
      ),
  },
  {
    name: 'session transcript appends with dedupe signature',
    test:
      /lastSignatureByDate/.test(transcript) &&
      /appendFile\(path,/.test(transcript),
  },
  {
    name: 'session data uploader writes local JSONL with signature dedupe',
    test:
      /join\(getClaudeConfigHomeDir\(\), 'session-data'\)/.test(uploader) &&
      /let lastSignature/.test(uploader) &&
      /appendFile\(path,/.test(uploader),
  },
  {
    name: 'task summary updates concurrent session activity',
    test:
      /updateSessionActivity\(\{[\s\S]*status: 'busy'[\s\S]*waitingFor/.test(
        summary,
      ),
  },
  {
    name: 'prepare-commit-msg hook content is concrete and idempotent',
    test:
      /HOOK_MARKER/.test(attribution) &&
      /prepare-commit-msg/.test(attribution) &&
      /grep -Fq/.test(attribution) &&
      /printf/.test(attribution),
  },
  {
    name: 'attribution hook installer handles gitdir indirection',
    test:
      /gitdir:/.test(attribution) && /resolveHooksDir/.test(attribution),
  },
  {
    name: 'attributionHooks registers installer on canonical git root',
    test:
      /findCanonicalGitRoot/.test(attributionHooks) &&
      /installPrepareCommitMsgHook/.test(attributionHooks),
  },
]

const failed = checks.filter(c => !c.test)
if (failed.length) {
  console.error('Persistence/attribution coverage check failed:')
  for (const f of failed) console.error(`- ${f.name}`)
  process.exit(1)
}

console.log('Persistence/attribution coverage check passed')
for (const c of checks) console.log(`- ${c.name}`)
