export type BandRole = 'owner' | 'editor' | 'viewer'

export function roleFromClerk(role: string): BandRole {
  if (role === 'org:admin') return 'owner'
  if (role === 'org:editor') return 'editor'
  return 'viewer'
}

export function roleToClerk(role: BandRole) {
  if (role === 'owner') return 'org:admin'
  if (role === 'editor') return 'org:editor'
  return 'org:viewer'
}
