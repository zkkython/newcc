import { mkdir, readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'

type JobState = {
  id: string
  template: string
  createdAt: string
  updatedAt: string
  status: 'open' | 'closed'
  prompt?: string
  replies: Array<{ at: string; text: string }>
}

function sanitizeForPath(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 48) || 'default'
}

function printTemplatesHelp(): void {
  process.stdout.write(
    [
      'Template jobs (reconstructed)',
      '',
      'Usage:',
      '  claude new [template] [prompt...]',
      '  claude list',
      '  claude reply <jobId> <message...>',
      '',
      'Examples:',
      '  claude new bugfix "Investigate flaky test"',
      '  claude list',
      '  claude reply job-bugfix-abc12345 "Please include repro steps"',
    ].join('\n') + '\n',
  )
}

function getJobsRoot(): string {
  return join(getClaudeConfigHomeDir(), 'jobs')
}

function getStatePath(jobDir: string): string {
  return join(jobDir, 'state.json')
}

async function ensureJobsRoot(): Promise<string> {
  const root = getJobsRoot()
  await mkdir(root, { recursive: true })
  return root
}

async function createJob(template: string, prompt?: string): Promise<JobState> {
  const now = new Date().toISOString()
  const suffix = Math.random().toString(36).slice(2, 10)
  const id = `job-${sanitizeForPath(template)}-${suffix}`
  const root = await ensureJobsRoot()
  const dir = join(root, id)
  await mkdir(dir, { recursive: true })

  const state: JobState = {
    id,
    template,
    createdAt: now,
    updatedAt: now,
    status: 'open',
    prompt,
    replies: [],
  }
  await writeFile(getStatePath(dir), JSON.stringify(state, null, 2), 'utf-8')
  return state
}

async function readJobs(): Promise<JobState[]> {
  const root = await ensureJobsRoot()
  const entries = await readdir(root, { withFileTypes: true })
  const states = await Promise.all(
    entries
      .filter(e => e.isDirectory() && e.name.startsWith('job-'))
      .map(async entry => {
        try {
          const raw = await readFile(getStatePath(join(root, entry.name)), 'utf-8')
          return JSON.parse(raw) as JobState
        } catch {
          return null
        }
      }),
  )
  return states
    .filter((s): s is JobState => s !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

async function appendReply(jobId: string, replyText: string): Promise<boolean> {
  const root = await ensureJobsRoot()
  const dir = join(root, jobId)
  const statePath = getStatePath(dir)
  let state: JobState
  try {
    state = JSON.parse(await readFile(statePath, 'utf-8')) as JobState
  } catch {
    return false
  }
  state.replies.push({ at: new Date().toISOString(), text: replyText })
  state.updatedAt = new Date().toISOString()
  await writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8')
  return true
}

export async function templatesMain(args: string[]): Promise<void> {
  const cmd = args[0]
  if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') {
    printTemplatesHelp()
    return
  }

  if (cmd === 'new') {
    const template = args[1] && !args[1].startsWith('-') ? args[1] : 'default'
    const promptStart = template === 'default' ? 1 : 2
    const prompt = args.slice(promptStart).join(' ').trim() || undefined
    const created = await createJob(template, prompt)
    process.stdout.write(`Created template job ${created.id}\n`)
    process.stdout.write(`Template: ${created.template}\n`)
    if (created.prompt) {
      process.stdout.write(`Prompt: ${created.prompt}\n`)
    }
    process.stdout.write(`Directory: ${join(getJobsRoot(), created.id)}\n`)
    return
  }

  if (cmd === 'list') {
    const jobs = await readJobs()
    if (jobs.length === 0) {
      process.stdout.write('No template jobs found.\n')
      return
    }
    process.stdout.write('id\tstatus\ttemplate\tupdatedAt\treplies\n')
    for (const job of jobs) {
      process.stdout.write(
        `${job.id}\t${job.status}\t${job.template}\t${job.updatedAt}\t${job.replies.length}\n`,
      )
    }
    return
  }

  if (cmd === 'reply') {
    const jobId = args[1]
    const reply = args.slice(2).join(' ').trim()
    if (!jobId || !reply) {
      process.stderr.write('Usage: claude reply <jobId> <message...>\n')
      return
    }
    const ok = await appendReply(jobId, reply)
    if (!ok) {
      process.stderr.write(`Job not found: ${jobId}\n`)
      return
    }
    process.stdout.write(`Reply recorded for ${jobId}\n`)
    return
  }

  process.stdout.write(`Unknown template subcommand: ${cmd}\n`)
  printTemplatesHelp()
}
