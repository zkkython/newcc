#!/usr/bin/env node
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

async function runForkSmoke() {
  const mod = await import('../../src/commands/fork/index.ts')
  const cmd = await mod.default.load()
  const res = await cmd.call('investigate retries')
  assert(res?.type === 'text', 'fork: response type must be text')
  assert(
    String(res.value).includes('Run this as a forked background worker.'),
    'fork: missing expected guidance text',
  )
}

async function runWorkflowsSmoke(configDir) {
  process.env.CLAUDE_CONFIG_DIR = configDir
  const mod = await import('../../src/commands/workflows/index.ts')
  const cmd = await mod.default.load()

  const add = await cmd.call('add smoke-test hello $ARGS')
  assert(add?.type === 'text', 'workflows add: response type must be text')
  assert(/Saved workflow/.test(String(add.value)), 'workflows add: save failed')

  const run = await cmd.call('run smoke-test world')
  assert(run?.type === 'text', 'workflows run: response type must be text')
  assert(
    String(run.value).includes('hello world'),
    'workflows run: template substitution failed',
  )
}

async function runBuddySmoke(configDir) {
  if (process.env.CLAUDE_RECOVERY_ENABLE_BUDDY_SMOKE !== '1') {
    return {
      ok: true,
      skipped: true,
      reason:
        'buddy smoke disabled by default (requires broader dependency graph)',
    }
  }
  process.env.CLAUDE_CONFIG_DIR = configDir
  try {
    const mod = await import('../../src/commands/buddy/index.ts')
    const cmd = await mod.default.load()

    const hatch = await cmd.call('hatch smokey')
    assert(hatch?.type === 'text', 'buddy hatch: response type must be text')
    assert(
      /Hatched buddy/.test(String(hatch.value)),
      'buddy hatch: hatch failed',
    )

    const rename = await cmd.call('rename ember')
    assert(rename?.type === 'text', 'buddy rename: response type must be text')
    assert(
      /renamed to ember/.test(String(rename.value)),
      'buddy rename: rename failed',
    )

    const status = await cmd.call('')
    assert(status?.type === 'text', 'buddy status: response type must be text')
    assert(
      /Buddy: ember/.test(String(status.value)),
      'buddy status: expected renamed buddy',
    )
    return { ok: true, skipped: false, reason: '' }
  } catch (error) {
    const msg = String(error instanceof Error ? error.message : error)
    if (msg.includes("Cannot find module 'bun:bundle'")) {
      return {
        ok: true,
        skipped: true,
        reason: 'buddy requires bun:bundle in current Node+tsx runtime',
      }
    }
    if (msg.includes("Cannot find module '@anthropic-ai/sdk'")) {
      return {
        ok: true,
        skipped: true,
        reason: 'buddy transitive dependency @anthropic-ai/sdk is not installed in this snapshot',
      }
    }
    throw error
  }
}

const configDir = mkdtempSync(join(tmpdir(), 'claude-code-recovery-smoke-'))
try {
  await runForkSmoke()
  await runWorkflowsSmoke(configDir)
  const buddy = await runBuddySmoke(configDir)
  console.log('Command execution smoke passed')
  console.log('- fork')
  console.log('- workflows (add/run)')
  if (buddy.skipped) {
    console.log(`- buddy skipped (${buddy.reason})`)
  } else {
    console.log('- buddy (hatch/rename/status)')
  }
} finally {
  rmSync(configDir, { recursive: true, force: true })
}
