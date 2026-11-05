import { m } from '@/paraglide/messages'

export type Role = 'owner' | 'editor' | 'viewer'

export function roleName(role: Role) {
  if (role === 'owner') return m.owner()
  if (role === 'editor') return m.editorRole()
  return m.viewer()
}
