export type DiscoveredRemoteSkill = {
  slug: string
  url: string
  name?: string
  description?: string
}

const discoveredSkills = new Map<string, DiscoveredRemoteSkill>()

export function stripCanonicalPrefix(name: string): string | null {
  const prefix = '_canonical_'
  return name.startsWith(prefix) ? name.slice(prefix.length) : null
}

export function setDiscoveredRemoteSkills(
  skills: DiscoveredRemoteSkill[],
): void {
  discoveredSkills.clear()
  for (const skill of skills) {
    discoveredSkills.set(skill.slug, skill)
  }
}

export function upsertDiscoveredRemoteSkill(skill: DiscoveredRemoteSkill): void {
  discoveredSkills.set(skill.slug, skill)
}

export function getDiscoveredRemoteSkill(
  slug: string,
): DiscoveredRemoteSkill | undefined {
  return discoveredSkills.get(slug)
}

export function getAllDiscoveredRemoteSkills(): DiscoveredRemoteSkill[] {
  return Array.from(discoveredSkills.values())
}
