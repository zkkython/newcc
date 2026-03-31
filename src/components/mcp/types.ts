import type { Tool } from '../../Tool.js'
import type {
  ConfigScope,
  MCPServerConnection,
  McpClaudeAIProxyServerConfig,
  McpHTTPServerConfig,
  McpSSEServerConfig,
  McpStdioServerConfig,
} from '../../services/mcp/types.js'

export type AgentMcpServerInfo = {
  name: string
  sourceAgents: string[]
  transport: 'stdio' | 'sse' | 'http' | 'ws'
  command?: string
  url?: string
  needsAuth: boolean
  isAuthenticated?: boolean
}

type BaseServerInfo<TTransport extends string, TConfig> = {
  name: string
  client: MCPServerConnection
  scope: ConfigScope
  transport: TTransport
  config: TConfig
}

export type StdioServerInfo = BaseServerInfo<'stdio', McpStdioServerConfig>

export type SSEServerInfo = BaseServerInfo<'sse', McpSSEServerConfig> & {
  isAuthenticated?: boolean
}

export type HTTPServerInfo = BaseServerInfo<'http', McpHTTPServerConfig> & {
  isAuthenticated?: boolean
}

export type ClaudeAIServerInfo = BaseServerInfo<
  'claudeai-proxy',
  McpClaudeAIProxyServerConfig
> & {
  isAuthenticated?: boolean
}

export type ServerInfo =
  | StdioServerInfo
  | SSEServerInfo
  | HTTPServerInfo
  | ClaudeAIServerInfo

export type MCPViewState =
  | { type: 'list'; defaultTab?: string }
  | { type: 'server-menu'; server: ServerInfo }
  | { type: 'agent-server-menu'; agentServer: AgentMcpServerInfo }
  | { type: 'server-tools'; server: ServerInfo }
  | { type: 'tool-detail'; server: ServerInfo; tool: Tool }
  | { type: string; [key: string]: unknown }
