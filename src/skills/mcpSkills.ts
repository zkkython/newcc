import memoize from 'lodash-es/memoize.js'
import type { Command } from '../commands.js'
import type { ConnectedMCPServer } from '../services/mcp/types.js'

/**
 * Placeholder MCP skill discovery for reconstructed builds.
 * Real MCP `skill://` parsing is unavailable in this snapshot, so we expose
 * an empty list while preserving cache semantics expected by callers.
 */
export const fetchMcpSkillsForClient = memoize(
  async (_client: ConnectedMCPServer): Promise<Command[]> => [],
  client => client.name,
)
