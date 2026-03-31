const OPEN_NAMESPACE_ALLOWLIST = new Set([
  'homespace',
  'default',
  'dev',
  'development',
  'local',
])

export function checkProtectedNamespace(): boolean {
  const ns =
    process.env.COO_NAMESPACE ??
    process.env.KUBERNETES_NAMESPACE ??
    process.env.NAMESPACE

  const normalized = ns?.trim().toLowerCase()
  if (normalized && OPEN_NAMESPACE_ALLOWLIST.has(normalized)) {
    return false
  }

  if (
    process.env.COO_RUNNING_ON_HOMESPACE === '1' ||
    process.env.COO_RUNNING_ON_HOMESPACE === 'true'
  ) {
    return false
  }

  return Boolean(
    normalized ||
      process.env.COO_CLUSTER ||
      process.env.KUBERNETES_SERVICE_HOST,
  )
}
