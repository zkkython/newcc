const fileContentCache = new Map<string, string>()

export function registerAttributionHooks(): void {
  // Reconstructed baseline: keep setup/clear flows callable.
}

export function sweepFileContentCache(): void {
  fileContentCache.clear()
}

export function clearAttributionCaches(): void {
  fileContentCache.clear()
}
