export type CachedMCConfig = {
  enabled: boolean
  supportedModels: string[]
}

const DEFAULT_CONFIG: CachedMCConfig = {
  enabled: false,
  supportedModels: [],
}

export function getCachedMCConfig(): CachedMCConfig {
  return DEFAULT_CONFIG
}
