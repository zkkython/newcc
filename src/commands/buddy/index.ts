import type { Command } from '../../commands.js'
import { companionUserId, getCompanion } from '../../buddy/companion.js'
import type { LocalCommandCall } from '../../types/command.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seededPick<T>(seed: number, items: readonly T[], offset = 0): T {
  const idx = Math.abs((seed + offset * 1315423911) % items.length)
  return items[idx]!
}

function sanitizeName(raw: string): string {
  return raw.replace(/[^\p{L}\p{N}_-]/gu, '').slice(0, 24)
}

function buddyHelp(): string {
  return [
    'Buddy command',
    '',
    'Usage:',
    '  /buddy',
    '  /buddy hatch [name]',
    '  /buddy rename <name>',
    '  /buddy mute',
    '  /buddy unmute',
    '  /buddy release',
  ].join('\n')
}

function defaultSoul(): { name: string; personality: string } {
  const seed = hashString(companionUserId())
  const names = [
    'Pico',
    'Mochi',
    'Nova',
    'Biscuit',
    'Rivet',
    'Pluto',
    'Echo',
    'Zuzu',
  ] as const
  const personalities = [
    'cheers for clean diffs and elegant refactors',
    'quietly judges flaky tests and loves deterministic builds',
    'gets excited whenever a bug gets a reproducible testcase',
    'prefers small commits and brutally clear commit messages',
    'brings suspicious confidence to late-night debugging sessions',
  ] as const
  return {
    name: seededPick(seed, names),
    personality: seededPick(seed, personalities, 1),
  }
}

const call: LocalCommandCall = async args => {
  const tokens = args.trim().split(/\s+/).filter(Boolean)
  const sub = tokens[0]?.toLowerCase()
  const rest = tokens.slice(1)

  if (sub === 'help' || sub === '--help' || sub === '-h') {
    return { type: 'text', value: buddyHelp() }
  }

  if (sub === 'hatch') {
    const current = getCompanion()
    if (current) {
      return {
        type: 'text',
        value: `Buddy already hatched: ${current.name} (${current.species}, ${current.rarity})`,
      }
    }
    const soul = defaultSoul()
    const requested = rest.join(' ').trim()
    const name = requested ? sanitizeName(requested) : soul.name
    if (!name) {
      return { type: 'text', value: 'Invalid buddy name.' }
    }
    saveGlobalConfig(cfg => ({
      ...cfg,
      companion: {
        name,
        personality: soul.personality,
        hatchedAt: Date.now(),
      },
    }))
    const hatched = getCompanion()
    return {
      type: 'text',
      value: hatched
        ? `Hatched buddy ${hatched.name} (${hatched.species}, ${hatched.rarity}).`
        : `Hatched buddy ${name}.`,
    }
  }

  if (sub === 'rename') {
    const name = sanitizeName(rest.join(' ').trim())
    if (!name) return { type: 'text', value: 'Usage: /buddy rename <name>' }
    const currentCfg = getGlobalConfig().companion
    if (!currentCfg) {
      return { type: 'text', value: 'No buddy yet. Run /buddy hatch first.' }
    }
    saveGlobalConfig(cfg => ({
      ...cfg,
      companion: { ...currentCfg, name },
    }))
    return { type: 'text', value: `Buddy renamed to ${name}.` }
  }

  if (sub === 'mute' || sub === 'unmute') {
    const muted = sub === 'mute'
    saveGlobalConfig(cfg => ({ ...cfg, companionMuted: muted }))
    return {
      type: 'text',
      value: muted ? 'Buddy muted.' : 'Buddy unmuted.',
    }
  }

  if (sub === 'release') {
    if (!getGlobalConfig().companion) {
      return { type: 'text', value: 'No buddy to release.' }
    }
    saveGlobalConfig(cfg => ({
      ...cfg,
      companion: undefined,
    }))
    return { type: 'text', value: 'Buddy released.' }
  }

  if (tokens.length > 0) {
    return { type: 'text', value: buddyHelp() }
  }

  const companion = getCompanion()
  if (!companion) {
    const soul = defaultSoul()
    return {
      type: 'text',
      value:
        `No buddy hatched yet.\n` +
        `Run /buddy hatch to create one (default name: ${soul.name}).`,
    }
  }

  return {
    type: 'text',
    value:
      `Buddy: ${companion.name} (${companion.species}, ${companion.rarity})\n` +
      `Mood: ${companion.personality}\n` +
      `Muted: ${getGlobalConfig().companionMuted ? 'yes' : 'no'}`,
  }
}

const buddy = {
  type: 'local',
  name: 'buddy',
  description: 'Show current companion status',
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
} satisfies Command

export default buddy
