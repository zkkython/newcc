import { mkdir, readFile, writeFile } from 'fs/promises'
import { basename, join } from 'path'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'

export type RemoteSkillLoadResult = {
  cacheHit: boolean
  latencyMs: number
  skillPath: string
  content: string
  fileCount: number
  totalBytes: number
  fetchMethod: 'disk-cache' | 'network'
}

function getRemoteSkillCacheDir(): string {
  return join(getClaudeConfigHomeDir(), 'cache', 'remote-skills')
}

export async function loadRemoteSkill(
  slug: string,
  url: string,
): Promise<RemoteSkillLoadResult> {
  const started = Date.now()
  const cacheDir = getRemoteSkillCacheDir()
  await mkdir(cacheDir, { recursive: true })
  const cachePath = join(cacheDir, `${slug}.md`)

  try {
    const cached = await readFile(cachePath, 'utf8')
    return {
      cacheHit: true,
      latencyMs: Date.now() - started,
      skillPath: cachePath,
      content: cached,
      fileCount: 1,
      totalBytes: Buffer.byteLength(cached, 'utf8'),
      fetchMethod: 'disk-cache',
    }
  } catch {
    // cache miss; continue to fetch
  }

  const resp = await fetch(url)
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} while fetching ${basename(url)}`)
  }
  const content = await resp.text()
  await writeFile(cachePath, content, 'utf8')

  return {
    cacheHit: false,
    latencyMs: Date.now() - started,
    skillPath: cachePath,
    content,
    fileCount: 1,
    totalBytes: Buffer.byteLength(content, 'utf8'),
    fetchMethod: 'network',
  }
}
