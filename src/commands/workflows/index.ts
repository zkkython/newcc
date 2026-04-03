import type { Command } from '../../commands.js'
import { mkdir, readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { LocalCommandCall } from '../../types/command.js'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'

function workflowsHelp(): string {
  return [
    'Workflows command',
    '',
    'Usage:',
    '  /workflows',
    '  /workflows list',
    '  /workflows show <name>',
    '  /workflows add <name> <prompt...>',
    '  /workflows run <name> [args...]',
  ].join('\n')
}

function workflowsDir(): string {
  return join(getClaudeConfigHomeDir(), 'workflows')
}

function workflowPath(name: string): string {
  return join(workflowsDir(), `${name}.md`)
}

function sanitizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-')
}

async function listWorkflowNames(): Promise<string[]> {
  await mkdir(workflowsDir(), { recursive: true })
  const entries = await readdir(workflowsDir(), { withFileTypes: true })
  return entries
    .filter(e => e.isFile() && e.name.endsWith('.md'))
    .map(e => e.name.slice(0, -3))
    .sort((a, b) => a.localeCompare(b))
}

const call: LocalCommandCall = async args => {
  const trimmed = args.trim()
  const tokens = trimmed.split(/\s+/).filter(Boolean)
  const sub = (tokens[0] ?? '').toLowerCase()

  if (!sub || sub === 'help' || sub === '--help' || sub === '-h') {
    const names = await listWorkflowNames()
    return {
      type: 'text',
      value:
        workflowsHelp() +
        `\n\nInstalled workflows: ${names.length === 0 ? '(none)' : names.join(', ')}`,
    }
  }

  if (sub === 'list') {
    const names = await listWorkflowNames()
    return {
      type: 'text',
      value:
        names.length === 0
          ? 'No workflows installed. Use /workflows add <name> <prompt...>.'
          : `Workflows:\n${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}`,
    }
  }

  if (sub === 'show') {
    const rawName = tokens[1]
    if (!rawName) return { type: 'text', value: 'Usage: /workflows show <name>' }
    const name = sanitizeName(rawName)
    try {
      const content = await readFile(workflowPath(name), 'utf8')
      return {
        type: 'text',
        value: `# workflow:${name}\n\n${content.trim()}`,
      }
    } catch {
      return { type: 'text', value: `Workflow not found: ${name}` }
    }
  }

  if (sub === 'add') {
    const rawName = tokens[1]
    if (!rawName) {
      return { type: 'text', value: 'Usage: /workflows add <name> <prompt...>' }
    }
    const name = sanitizeName(rawName)
    const prompt = tokens.slice(2).join(' ').trim()
    if (!name || !prompt) {
      return { type: 'text', value: 'Usage: /workflows add <name> <prompt...>' }
    }
    await mkdir(workflowsDir(), { recursive: true })
    await writeFile(workflowPath(name), `${prompt}\n`, 'utf8')
    return { type: 'text', value: `Saved workflow ${name}.` }
  }

  if (sub === 'run') {
    const rawName = tokens[1]
    if (!rawName) return { type: 'text', value: 'Usage: /workflows run <name> [args...]' }
    const name = sanitizeName(rawName)
    let template: string
    try {
      template = await readFile(workflowPath(name), 'utf8')
    } catch {
      return { type: 'text', value: `Workflow not found: ${name}` }
    }
    const runtimeArgs = tokens.slice(2).join(' ').trim()
    const rendered = template
      .replaceAll('$ARGS', runtimeArgs)
      .replaceAll('$ARGUMENTS', runtimeArgs)
      .trim()
    return {
      type: 'text',
      value:
        `Running workflow ${name}${runtimeArgs ? ` with args: ${runtimeArgs}` : ''}\n` +
        `\n${rendered || '(empty workflow prompt)'}`,
    }
  }

  return { type: 'text', value: workflowsHelp() }
}

const workflows = {
  type: 'local',
  name: 'workflows',
  aliases: ['workflow'],
  description: 'Inspect workflow subsystem status',
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
} satisfies Command

export default workflows
