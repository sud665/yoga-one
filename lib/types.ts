import type { Database } from './database.types'

export type Studio = Database['public']['Tables']['studios']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileRole = Database['public']['Enums']['profile_role']
export type Invite = Database['public']['Tables']['invites']['Row']
