import { chmod, mkdir, readFile, stat, writeFile } from 'fs/promises'
import { dirname, join, resolve } from 'path'

const HOOK_MARKER = 'claude-code-prepare-commit-msg-hook'
const HOOK_CONTENT = `#!/bin/sh
# ${HOOK_MARKER}
# Appends a single attribution trailer when CLAUDE_CODE_ATTRIBUTION_TRAILER is set.
# Runs in prepare-commit-msg so users can still edit/remove the trailer manually.

MSG_FILE="$1"
SOURCE="$2"
TRAILER="$CLAUDE_CODE_ATTRIBUTION_TRAILER"

[ -n "$TRAILER" ] || exit 0
[ -n "$MSG_FILE" ] || exit 0

# Avoid adding trailer to merge/squash auto-generated messages.
case "$SOURCE" in
  merge|squash)
    exit 0
    ;;
esac

# Idempotent append.
if grep -Fq "$TRAILER" "$MSG_FILE" 2>/dev/null; then
  exit 0
fi

printf "\\n%s\\n" "$TRAILER" >> "$MSG_FILE"
exit 0
`

export async function installPrepareCommitMsgHook(
  repoPath: string,
  hooksDirOverride?: string,
): Promise<void> {
  const hooksDir = hooksDirOverride ?? (await resolveHooksDir(repoPath))
  const hookPath = join(hooksDir, 'prepare-commit-msg')
  await mkdir(dirname(hookPath), { recursive: true })
  const existing = await readFile(hookPath, 'utf8').catch(() => '')
  if (existing && !existing.includes(HOOK_MARKER)) {
    // Respect existing custom hooks. Skip clobbering non-Claude hook scripts.
    return
  }
  await writeFile(hookPath, HOOK_CONTENT, 'utf8')
  await chmod(hookPath, 0o755)
}

async function resolveHooksDir(repoPath: string): Promise<string> {
  const dotGitPath = join(repoPath, '.git')
  try {
    const st = await stat(dotGitPath)
    if (st.isDirectory()) {
      return join(dotGitPath, 'hooks')
    }
    if (st.isFile()) {
      const text = await readFile(dotGitPath, 'utf8')
      const m = text.match(/^gitdir:\s*(.+)$/m)
      if (m?.[1]) {
        const gitDir = resolve(repoPath, m[1].trim())
        return join(gitDir, 'hooks')
      }
    }
  } catch {
    // fallback below
  }
  return join(repoPath, '.git', 'hooks')
}
