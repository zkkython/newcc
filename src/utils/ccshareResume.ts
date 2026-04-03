import { readdir } from 'fs/promises'
import { basename, join } from 'path'
import { type LogOption } from '../types/logs.js'
import { getClaudeConfigHomeDir } from './envUtils.js'
import { loadTranscriptFromFile } from './sessionStorage.js'

/**
 * Accepts:
 * - raw share id: "boris-20260311-211036"
 * - URL path tail: ".../ccshare/<id>"
 */
export function parseCcshareId(input: string): string | null {
  const value = input.trim()
  if (!value) return null

  const match = value.match(/(?:^|\/)([a-z0-9][a-z0-9-]*\d)$/i)
  if (match) return match[1] ?? null

  // Fallback for fully custom IDs that are not URL-like.
  if (!value.includes('://') && !value.includes('/')) {
    return value
  }
  return null
}

const MAX_SCAN_DEPTH = 3

async function findTranscriptCandidates(
  root: string,
  ccshareId: string,
  depth = 0,
): Promise<string[]> {
  if (depth > MAX_SCAN_DEPTH) return []
  let entries: Awaited<ReturnType<typeof readdir>>
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch {
    return []
  }
  const matches: string[] = []
  for (const entry of entries) {
    const fullPath = join(root, entry.name)
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.git') || entry.name === 'node_modules') {
        continue
      }
      matches.push(...(await findTranscriptCandidates(fullPath, ccshareId, depth + 1)))
      continue
    }
    if (!entry.isFile()) continue
    if (!(entry.name.endsWith('.jsonl') || entry.name.endsWith('.json'))) {
      continue
    }
    const fileName = basename(entry.name).toLowerCase()
    if (fileName.includes(ccshareId.toLowerCase())) {
      matches.push(fullPath)
    }
  }
  return matches
}

export async function loadCcshare(ccshareId: string): Promise<LogOption> {
  const searchRoots = [process.cwd(), getClaudeConfigHomeDir()]
  const candidates = new Set<string>()
  for (const root of searchRoots) {
    for (const match of await findTranscriptCandidates(root, ccshareId)) {
      candidates.add(match)
    }
  }
  for (const candidate of candidates) {
    try {
      return await loadTranscriptFromFile(candidate)
    } catch {
      // Try next candidate.
    }
  }

  throw new Error(
    `Unable to locate local transcript for ccshare id "${ccshareId}". ` +
      `Searched ${searchRoots.join(', ')} for *.jsonl/*.json files containing this id.`,
  )
}
