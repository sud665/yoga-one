'use server'

import { createClient } from '@/lib/supabase/server'

// Relies entirely on RLS ("profiles: view same studio", Task 2's
// current_studio_id()-based policy) to scope this select to the caller's own
// studio -- no explicit studio_id filter needed or added, same pattern as
// listInvites() in lib/actions/invites.ts and listInstructors() in
// lib/actions/schedule.ts. Unlike invites (owner-only RLS policy), any
// authenticated profile in the studio can read this, but in practice this
// action is only ever called from the owner-gated /admin/roster/* pages.
export async function listProfilesByRole(role: 'instructor' | 'member') {
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('*').eq('role', role).order('full_name')
  return data ?? []
}
