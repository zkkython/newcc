import type { Command } from '../../commands.js'
import type { LocalCommandCall } from '../../types/command.js'
import { getCompanion } from '../../buddy/companion.js'

const call: LocalCommandCall = async () => {
  const companion = getCompanion()
  if (!companion) {
    return {
      type: 'text',
      value:
        'No buddy is hatched yet. Buddy UI assets are present, but full buddy interaction command flow is still partially reconstructed.',
    }
  }

  return {
    type: 'text',
    value: `Buddy: ${companion.name} (${companion.species}, ${companion.rarity})`,
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
