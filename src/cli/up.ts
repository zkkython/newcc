import { readFile } from 'fs/promises'
import { dirname, join } from 'path'
import { cwd } from 'process'
import { setup } from '../setup.js'

async function findNearestClaudeMd(startDir: string): Promise<string | null> {
  let current = startDir
  // Root walk guard
  for (let i = 0; i < 64; i += 1) {
    const candidate = join(current, 'CLAUDE.md')
    try {
      await readFile(candidate, 'utf8')
      return candidate
    } catch {
      // keep walking
    }
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
  return null
}

function extractClaudeUpSection(markdown: string): string | null {
  const lines = markdown.split(/\r?\n/)
  let start = -1
  let level = 0
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i]?.match(/^(#{1,6})\s+claude up\b/i)
    if (m) {
      start = i + 1
      level = m[1]!.length
      break
    }
  }
  if (start === -1) return null
  const out: string[] = []
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i]!
    const heading = line.match(/^(#{1,6})\s+/)
    if (heading && heading[1]!.length <= level) {
      break
    }
    out.push(line)
  }
  const text = out.join('\n').trim()
  return text.length > 0 ? text : null
}

export async function up(): Promise<void> {
  await setup(cwd(), 'default', false, false, undefined, false)

  const claudeMdPath = await findNearestClaudeMd(cwd())
  if (!claudeMdPath) {
    process.stdout.write(
      'Setup completed. No nearby CLAUDE.md found for "# claude up" instructions.\n',
    )
    return
  }

  const content = await readFile(claudeMdPath, 'utf8').catch(() => '')
  const section = extractClaudeUpSection(content)
  if (!section) {
    process.stdout.write(
      `Setup completed. No "# claude up" section found in ${claudeMdPath}.\n`,
    )
    return
  }
  process.stdout.write(
    `Setup completed. Instructions from ${claudeMdPath}:\n\n${section}\n`,
  )
}
