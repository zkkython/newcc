#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function read(rel) {
  return readFileSync(resolve(rel), 'utf8')
}

const files = {
  bg: read('src/cli/bg.ts'),
  daemon: read('src/daemon/main.ts'),
  entryCli: read('src/entrypoints/cli.tsx'),
  buddy: read('src/commands/buddy/index.ts'),
  fork: read('src/commands/fork/index.ts'),
  workflows: read('src/commands/workflows/index.ts'),
  share: read('src/commands/share/index.js'),
  teleport: read('src/commands/teleport/index.js'),
}

const checks = [
  {
    name: 'bg handlers exported',
    test:
      /export async function psHandler/.test(files.bg) &&
      /export async function logsHandler/.test(files.bg) &&
      /export async function attachHandler/.test(files.bg) &&
      /export async function killHandler/.test(files.bg) &&
      /export async function handleBgFlag/.test(files.bg),
  },
  {
    name: 'daemon entrypoint exported with start/stop/status branches',
    test:
      /export async function daemonMain/.test(files.daemon) &&
      /case 'start'/.test(files.daemon) &&
      /case 'stop'/.test(files.daemon) &&
      /case 'status'/.test(files.daemon),
  },
  {
    name: 'CLI wires daemon and bg handlers',
    test:
      /await daemonMain\(args\.slice\(1\)\)/.test(files.entryCli) &&
      /await bg\.psHandler\(args\.slice\(1\)\)/.test(files.entryCli) &&
      /await bg\.logsHandler\(args\[1\]\)/.test(files.entryCli) &&
      /await bg\.attachHandler\(args\[1\]\)/.test(files.entryCli) &&
      /await bg\.killHandler\(args\[1\]\)/.test(files.entryCli) &&
      /await bg\.handleBgFlag\(args\)/.test(files.entryCli),
  },
  {
    name: 'buddy supports hatch/rename/mute/unmute/release',
    test:
      /if \(sub === 'hatch'\)/.test(files.buddy) &&
      /if \(sub === 'rename'\)/.test(files.buddy) &&
      /if \(sub === 'mute' \|\| sub === 'unmute'\)/.test(files.buddy) &&
      /if \(sub === 'release'\)/.test(files.buddy),
  },
  {
    name: 'fork command emits fork directive prefix',
    test:
      /FORK_DIRECTIVE_PREFIX/.test(files.fork) &&
      /\/fork <directive>/.test(files.fork),
  },
  {
    name: 'workflows supports list/show/add/run',
    test:
      /if \(sub === 'list'\)/.test(files.workflows) &&
      /if \(sub === 'show'\)/.test(files.workflows) &&
      /if \(sub === 'add'\)/.test(files.workflows) &&
      /if \(sub === 'run'\)/.test(files.workflows),
  },
  {
    name: 'share command writes local manifest with fallback remote share',
    test:
      /submitTranscriptShare/.test(files.share) &&
      /mode:\s*'local-reconstructed-share'/.test(files.share) &&
      /Created local share manifest/.test(files.share),
  },
  {
    name: 'teleport command delegates to teleportToRemote and prints URL',
    test:
      /teleportToRemote/.test(files.teleport) &&
      /getRemoteSessionUrl/.test(files.teleport) &&
      /Created remote session/.test(files.teleport),
  },
]

const failed = checks.filter(c => !c.test)
if (failed.length) {
  console.error('Command surface coverage check failed:')
  for (const f of failed) console.error(`- ${f.name}`)
  process.exit(1)
}

console.log('Command surface coverage check passed')
for (const c of checks) console.log(`- ${c.name}`)
