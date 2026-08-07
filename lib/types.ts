import type { Database } from './database.types'

export type Studio = Database['public']['Tables']['studios']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileRole = Database['public']['Enums']['profile_role']
export type Invite = Database['public']['Tables']['invites']['Row']
export type ClassTemplate = Database['public']['Tables']['class_templates']['Row']
export type ClassSession = Database['public']['Tables']['class_sessions']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
export type BookingStatus = Booking['status']
export type Notice = Database['public']['Tables']['notices']['Row']
export type NoticeTarget = Notice['target']
