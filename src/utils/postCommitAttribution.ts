import { chmod, mkdir, writeFile } from 'fs/promises'
import { dirname, join } from 'path'

const HOOK_CONTENT = `#!/bin/sh
# Reconstructed claude attribution hook placeholder.
exit 0
`

export async function installPrepareCommitMsgHook(
  repoPath: string,
  hooksDirOverride?: string,
): Promise<void> {
  const hooksDir = hooksDirOverride ?? join(repoPath, '.git', 'hooks')
  const hookPath = join(hooksDir, 'prepare-commit-msg')
  await mkdir(dirname(hookPath), { recursive: true })
  await writeFile(hookPath, HOOK_CONTENT, 'utf8')
  await chmod(hookPath, 0o755)
}
