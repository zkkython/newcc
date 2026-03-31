import memoize from 'lodash-es/memoize.js'
import { getCommands } from '../../commands.js'
import { getProjectRoot } from '../../bootstrap/state.js'

export type SkillIndexEntry = {
  name: string
  description?: string
}

export const getSkillIndex = memoize(async (): Promise<SkillIndexEntry[]> => {
  const commands = await getCommands(getProjectRoot())
  return commands
    .filter(c => c.type === 'prompt')
    .map(c => ({
      name: c.name,
      description: c.description,
    }))
})

export function clearSkillIndexCache(): void {
  getSkillIndex.cache?.clear?.()
}
