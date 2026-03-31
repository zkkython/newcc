// Reconstructed tool-progress contracts.

export type ToolProgressBase = {
  stage?: string
  message?: string
  percent?: number
  [key: string]: unknown
}

export type ShellProgress = ToolProgressBase
export type BashProgress = ToolProgressBase
export type PowerShellProgress = ToolProgressBase
export type WebSearchProgress = ToolProgressBase
export type MCPProgress = ToolProgressBase
export type SkillToolProgress = ToolProgressBase
export type AgentToolProgress = ToolProgressBase
export type SdkWorkflowProgress = ToolProgressBase
