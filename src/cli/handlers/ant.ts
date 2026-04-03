import { access, mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, resolve } from 'path'
import type { Message } from '../../types/message.js'
import { renderMessagesToPlainText } from '../../utils/exportRenderer.js'
import {
  getErrorLogByIndex,
  getLogDisplayTitle,
  loadErrorLogs,
  logError,
} from '../../utils/log.js'
import {
  getLogByIndex,
  loadFullLog,
  loadMessageLogs,
  loadTranscriptFromFile,
} from '../../utils/sessionStorage.js'
import {
  TASK_STATUSES,
  createTask,
  getTask,
  getTasksDir,
  listTasks,
  type Task,
  updateTask,
} from '../../utils/tasks.js'

function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 19)
}

function resolveTaskListId(list?: string): string {
  return list && list.trim().length > 0 ? list.trim() : 'tasklist'
}

async function findLogBySessionId(
  sessionId: string,
): Promise<Awaited<ReturnType<typeof loadMessageLogs>>[number] | null> {
  const logs = await loadMessageLogs()
  return logs.find(l => l.sessionId === sessionId) ?? null
}

function parseIndex(index: number, length: number): number {
  return index < 0 ? length + index : index
}

async function resolveSourceToMessages(source: string): Promise<Message[]> {
  const sourcePath = resolve(source)
  const looksLikeFile = /\.(jsonl?|ndjson)$/i.test(source)
  if (looksLikeFile) {
    await access(sourcePath)
    const loaded = await loadTranscriptFromFile(sourcePath)
    return loaded.messages as Message[]
  }

  const numeric = Number.parseInt(source, 10)
  if (Number.isFinite(numeric) && String(numeric) === source.trim()) {
    const logs = await loadMessageLogs()
    const idx = parseIndex(numeric, logs.length)
    const selected = await getLogByIndex(idx)
    if (!selected) {
      throw new Error(`Log index out of range: ${source}`)
    }
    const full = await loadFullLog(selected)
    return full.messages as Message[]
  }

  const bySession = await findLogBySessionId(source.trim())
  if (!bySession) {
    throw new Error(`Unable to resolve export source: ${source}`)
  }
  const full = await loadFullLog(bySession)
  return full.messages as Message[]
}

type CommanderLike = {
  commands?: Array<{
    name?: () => string
    aliases?: () => string[]
    commands?: CommanderLike['commands']
  }>
}

function getCommandNames(program: CommanderLike): string[] {
  const names = new Set<string>()
  for (const cmd of program.commands ?? []) {
    const name = cmd.name?.()
    if (name) names.add(name)
    for (const alias of cmd.aliases?.() ?? []) {
      if (alias) names.add(alias)
    }
  }
  return [...names].sort()
}

function generateCompletionScript(shell: string, commandNames: string[]): string {
  const words = commandNames.join(' ')
  switch (shell) {
    case 'bash':
      return `# Claude Code completion (reconstructed)\n_claude_complete() {\n  local cur\n  cur="\${COMP_WORDS[COMP_CWORD]}"\n  COMPREPLY=( $(compgen -W "${words}" -- "$cur") )\n}\ncomplete -F _claude_complete claude\n`
    case 'zsh':
      return `#compdef claude\n_claude_complete() {\n  local -a commands\n  commands=(${commandNames.join(' ')})\n  _describe 'command' commands\n}\ncompdef _claude_complete claude\n`
    case 'fish':
      return commandNames
        .map(name => `complete -c claude -f -a '${name}'`)
        .join('\n')
        .concat('\n')
    default:
      throw new Error(`Unsupported shell: ${shell}`)
  }
}

export async function logHandler(logId?: string | number): Promise<void> {
  const logs = await loadMessageLogs()
  if (logs.length === 0) {
    process.stdout.write('No logs found.\n')
    return
  }

  if (logId === undefined) {
    for (const log of logs.slice(0, 50)) {
      const title = getLogDisplayTitle(log, '(untitled)')
      process.stdout.write(
        `[${log.value}] ${formatDate(log.created)}  ${title}  (${log.sessionId ?? 'unknown'})\n`,
      )
    }
    return
  }

  const selected =
    typeof logId === 'number'
      ? await getLogByIndex(parseIndex(logId, logs.length))
      : await findLogBySessionId(String(logId))
  if (!selected) {
    process.stderr.write(`Log not found: ${String(logId)}\n`)
    return
  }

  const full = await loadFullLog(selected)
  const content = await renderMessagesToPlainText(full.messages as Message[])
  process.stdout.write(content || '(empty log)\n')
}

export async function errorHandler(number?: number): Promise<void> {
  const logs = await loadErrorLogs()
  if (logs.length === 0) {
    process.stdout.write('No error logs found.\n')
    return
  }

  if (number === undefined) {
    for (const log of logs.slice(0, 50)) {
      process.stdout.write(
        `[${log.value}] ${formatDate(log.created)}  ${log.fullPath ?? '(unknown path)'}\n`,
      )
    }
    return
  }

  const idx = parseIndex(number, logs.length)
  const selected = await getErrorLogByIndex(idx)
  if (!selected) {
    process.stderr.write(`Error log not found: ${number}\n`)
    return
  }

  if (selected.fullPath) {
    process.stdout.write(await readFile(selected.fullPath, 'utf-8'))
    return
  }
  process.stdout.write(JSON.stringify(selected.messages, null, 2) + '\n')
}

export async function exportHandler(
  source: string,
  outputFile: string,
): Promise<void> {
  try {
    const messages = await resolveSourceToMessages(source)
    const rendered = await renderMessagesToPlainText(messages)
    const outPath = resolve(outputFile)
    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath, rendered, 'utf-8')
    process.stdout.write(`Exported conversation to ${outPath}\n`)
  } catch (error) {
    logError(error)
    process.stderr.write(`Export failed: ${String(error)}\n`)
  }
}

export async function taskCreateHandler(
  subject: string,
  opts: { description?: string; list?: string } = {},
): Promise<void> {
  const taskListId = resolveTaskListId(opts.list)
  const id = await createTask(taskListId, {
    subject,
    description: opts.description ?? '',
    status: 'pending',
    blocks: [],
    blockedBy: [],
  })
  process.stdout.write(`Created task ${id} in list ${taskListId}\n`)
}

function renderTaskLine(task: Task): string {
  const owner = task.owner ? ` owner=${task.owner}` : ''
  return `${task.id}\t${task.status}\t${task.subject}${owner}`
}

export async function taskListHandler(opts: {
  list?: string
  pending?: boolean
  json?: boolean
} = {}): Promise<void> {
  const taskListId = resolveTaskListId(opts.list)
  let tasks = await listTasks(taskListId)
  tasks = tasks.sort(
    (a, b) => Number.parseInt(a.id, 10) - Number.parseInt(b.id, 10),
  )
  if (opts.pending) {
    tasks = tasks.filter(t => t.status === 'pending')
  }
  if (opts.json) {
    process.stdout.write(JSON.stringify(tasks, null, 2) + '\n')
    return
  }
  if (tasks.length === 0) {
    process.stdout.write(`No tasks in list ${taskListId}.\n`)
    return
  }
  process.stdout.write(`id\tstatus\tsubject\n`)
  for (const task of tasks) {
    process.stdout.write(renderTaskLine(task) + '\n')
  }
}

export async function taskGetHandler(
  id: string,
  opts: { list?: string } = {},
): Promise<void> {
  const taskListId = resolveTaskListId(opts.list)
  const task = await getTask(taskListId, id)
  if (!task) {
    process.stderr.write(`Task ${id} not found in list ${taskListId}.\n`)
    return
  }
  process.stdout.write(JSON.stringify(task, null, 2) + '\n')
}

export async function taskUpdateHandler(
  id: string,
  opts: {
    list?: string
    status?: string
    subject?: string
    description?: string
    owner?: string
    clearOwner?: boolean
  } = {},
): Promise<void> {
  const taskListId = resolveTaskListId(opts.list)
  if (
    opts.status &&
    !TASK_STATUSES.includes(opts.status as (typeof TASK_STATUSES)[number])
  ) {
    process.stderr.write(
      `Invalid status: ${opts.status}. Expected one of: ${TASK_STATUSES.join(', ')}\n`,
    )
    return
  }

  const updates: Partial<Omit<Task, 'id'>> = {}
  if (opts.status) updates.status = opts.status as Task['status']
  if (opts.subject !== undefined) updates.subject = opts.subject
  if (opts.description !== undefined) updates.description = opts.description
  if (opts.clearOwner) {
    updates.owner = undefined
  } else if (opts.owner !== undefined) {
    updates.owner = opts.owner
  }

  if (Object.keys(updates).length === 0) {
    process.stdout.write('No updates provided.\n')
    return
  }

  const updated = await updateTask(taskListId, id, updates)
  if (!updated) {
    process.stderr.write(`Task ${id} not found in list ${taskListId}.\n`)
    return
  }
  process.stdout.write(JSON.stringify(updated, null, 2) + '\n')
}

export async function taskDirHandler(opts: { list?: string } = {}): Promise<void> {
  const taskListId = resolveTaskListId(opts.list)
  process.stdout.write(`${getTasksDir(taskListId)}\n`)
}

export async function completionHandler(
  shell: string,
  opts: { output?: string },
  program: unknown,
): Promise<void> {
  const script = generateCompletionScript(
    shell.trim().toLowerCase(),
    getCommandNames(program as CommanderLike),
  )

  if (opts.output) {
    const outputPath = resolve(opts.output)
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, script, 'utf-8')
    process.stdout.write(`Wrote completion script to ${outputPath}\n`)
    return
  }
  process.stdout.write(script)
}
