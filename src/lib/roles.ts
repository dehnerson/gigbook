import { m } from '@/paraglide/messages'

export type Role = 'owner' | 'editor' | 'viewer'

export function roleName(role: Role) {
  if (role === 'owner') return m.owner()
  if (role === 'editor') return m.editorRole()
  return m.viewer()
}

export function roleFromClerk(role: string): Role {
  if (role === 'org:admin') return 'owner'
  if (role === 'org:editor') return 'editor'
  return 'viewer'
}
