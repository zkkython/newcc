import type { FileStateCache } from '../../utils/fileStateCache.js'

export type TipContext = {
  bashTools?: Set<string>
  readFileState?: FileStateCache
  [key: string]: unknown
}

export type Tip = {
  id: string
  content: (context?: TipContext) => Promise<string> | string
  cooldownSessions: number
  isRelevant: (context?: TipContext) => Promise<boolean> | boolean
}
