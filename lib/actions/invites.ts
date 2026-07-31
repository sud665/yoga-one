'use server'

import { createClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'
import type { AuthError } from '@supabase/supabase-js'

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

export async function acceptInviteWithPassword(
  code: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const fullName = String(formData.get('fullName') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!fullName || !email || !password) {
    return { error: '모든 항목을 입력해주세요.' }
  }

  const supabase = await createClient()
  const { error: signUpError } = await supabase.auth.signUp({ email, password })
  if (signUpError) {
    if (isEmailAlreadyRegisteredError(signUpError)) {
      // signUp() rejects a pre-existing email with its own AuthApiError --
      // never accept_invite's profile_already_exists exception, since we
      // never get far enough to call that RPC. Route it through the same
      // mapping anyway so the user sees the identical friendly message
      // instead of Supabase's raw (and untranslated) "User already
      // registered" text.
      return { error: mapAcceptInviteError('profile_already_exists') }
    }
    return { error: signUpError.message }
  }

  const { error: acceptError } = await supabase.rpc('accept_invite', { p_code: code, p_full_name: fullName })
  if (acceptError) return { error: mapAcceptInviteError(acceptError.message) }

  return { success: true }
}

// Checked against the installed @supabase/supabase-js's AuthError shape
// (verified locally: signUp() for an already-registered, confirmed email
// returns an AuthApiError with code 'user_already_exists' and message 'User
// already registered'). `code` is preferred since it's stable and
// locale-independent; `email_exists` is also accepted as the newer unified
// -identity error code covering the same condition in later GoTrue versions.
// The message substring check is only a fallback for cases where neither
// code comes through.
function isEmailAlreadyRegisteredError(error: AuthError): boolean {
  if (error.code === 'user_already_exists' || error.code === 'email_exists') return true
  return error.message.toLowerCase().includes('already registered')
}

// Not exported: every export from a 'use server' file is compiled into a
// public server-action reference by Next.js, which requires each export to
// be an async function. Keeping this as a plain, non-exported helper avoids
// tripping that constraint (a `next build` error, not just a lint nit).
function mapAcceptInviteError(message: string): string {
  if (message.includes('invite_expired')) return '초대 링크가 만료되었습니다. 원장님께 재발급을 요청해주세요.'
  if (message.includes('invite_already_used')) return '이미 사용된 초대 링크입니다. 원장님께 재발급을 요청해주세요.'
  if (message.includes('invite_invalid')) return '유효하지 않은 초대 링크입니다.'
  if (message.includes('profile_already_exists')) return '이미 다른 계정으로 가입되어 있습니다. 로그아웃 후 다시 시도해주세요.'
  return message
}
