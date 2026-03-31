/**
 * Accepts:
 * - raw share id: "boris-20260311-211036"
 * - URL path tail: ".../ccshare/<id>"
 */
export function parseCcshareId(input: string): string | null {
  const value = input.trim()
  if (!value) return null

  const match = value.match(/(?:^|\/)([a-z0-9][a-z0-9-]*\d)$/i)
  if (match) return match[1] ?? null

  // Fallback for fully custom IDs that are not URL-like.
  if (!value.includes('://') && !value.includes('/')) {
    return value
  }
  return null
}

export async function loadCcshare(_ccshareId: string): Promise<never> {
  throw new Error(
    'ccshare resume is not restored in reconstructed mode (missing service/backend implementation).',
  )
}
