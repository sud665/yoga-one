'use server'

import { createClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'

export async function createInvite(role: 'instructor' | 'member'): Promise<{ error: string } | { url: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { data: profile } = await supabase.from('profiles').select('studio_id, role').eq('id', user.id).single()
  if (!profile || profile.role !== 'owner') return { error: '원장만 초대를 발급할 수 있습니다.' }

  const code = nanoid(10)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase.from('invites').insert({
    studio_id: profile.studio_id,
    role,
    code,
    expires_at: expiresAt,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  return { url: `${process.env.NEXT_PUBLIC_SITE_URL}/invite/${code}` }
}

export async function listInvites() {
  const supabase = await createClient()
  const { data } = await supabase.from('invites').select('*').order('created_at', { ascending: false })
  return data ?? []
}
