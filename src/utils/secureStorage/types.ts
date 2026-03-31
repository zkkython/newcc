export type MCPDiscoveryState = {
  authorizationServerUrl?: string
  resourceMetadataUrl?: string
}

export type MCPOAuthTokenData = {
  serverUrl: string
  accessToken: string
  refreshToken?: string
  expiresAt: number
  scope?: string
  clientId?: string
  clientSecret?: string
  stepUpScope?: string
  discoveryState?: MCPDiscoveryState
}

export type MCPOAuthClientConfig = {
  clientSecret?: string
}

export type SecureStorageData = {
  mcpOAuth?: Record<string, MCPOAuthTokenData>
  mcpOAuthClientConfig?: Record<string, MCPOAuthClientConfig>
  pluginSecrets?: Record<string, Record<string, string>>
  trustedDeviceToken?: string
  [key: string]: unknown
}

export type SecureStorage = {
  name: string
  read(): SecureStorageData | null
  readAsync(): Promise<SecureStorageData | null>
  update(data: SecureStorageData): { success: boolean; warning?: string }
  delete(): boolean
}
