import { fetchCodeSessionsFromSessionsAPI } from '../utils/teleport/api.js'

export type AssistantSession = {
  id: string
  title: string
  status: string
  updatedAt: string
  createdAt: string
}

const ACTIVE_STATUSES = new Set(['idle', 'working', 'waiting', 'running'])

export async function discoverAssistantSessions(): Promise<AssistantSession[]> {
  const sessions = await fetchCodeSessionsFromSessionsAPI()

  const discovered = sessions
    .filter(s => ACTIVE_STATUSES.has(s.status))
    .map(s => ({
      id: s.id,
      title: s.title || 'Untitled session',
      status: s.status,
      updatedAt: s.updated_at,
      createdAt: s.created_at,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return discovered
}
