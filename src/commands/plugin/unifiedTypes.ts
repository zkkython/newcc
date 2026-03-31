import type { MCPServerConnection } from '../../services/mcp/types.js'
import type { LoadedPlugin, PluginError } from '../../types/plugin.js'

export type UnifiedInstalledScope =
  | 'user'
  | 'project'
  | 'local'
  | 'managed'
  | 'builtin'
  | 'dynamic'
  | 'enterprise'
  | 'flagged'

export type UnifiedInstalledItem =
  | {
      type: 'plugin'
      id: string
      name: string
      description?: string
      marketplace: string
      scope: Exclude<UnifiedInstalledScope, 'flagged'>
      isEnabled: boolean
      errorCount: number
      errors: PluginError[]
      plugin: LoadedPlugin
      pendingEnable?: boolean
      pendingUpdate?: boolean
      pendingToggle?: 'will-enable' | 'will-disable'
    }
  | {
      type: 'failed-plugin'
      id: string
      name: string
      marketplace: string
      scope: Exclude<UnifiedInstalledScope, 'flagged'>
      errorCount: number
      errors: PluginError[]
    }
  | {
      type: 'flagged-plugin'
      id: string
      name: string
      marketplace: string
      scope: 'flagged'
      reason: string
      text: string
      flaggedAt?: string
    }
  | {
      type: 'mcp'
      id: string
      name: string
      description?: string
      scope: Exclude<UnifiedInstalledScope, 'flagged' | 'builtin'>
      status: 'connected' | 'disabled' | 'pending' | 'needs-auth' | 'failed'
      client: MCPServerConnection
      indented?: boolean
    }
