'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

export interface MyProfile {
  fullName: string
  phone: string
  email: string
  role: 'owner' | 'instructor' | 'member'
  /**
   * False for an account that only ever signed in through Kakao. Supabase
   * will happily set a password on such a user, but the resulting credential
   * has nowhere to be typed -- those users never see the email/password form
   * -- so the whole section is hidden rather than shipped as a dead end.
   */
  canChangePassword: boolean
}

export async function getMyProfile(): Promise<MyProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // RLS scopes this to the caller's own studio, and `id = user.id` narrows it
  // to their own row -- same "let the policy do the filtering" pattern as
  // listProfilesByRole().
  const { data } = await supabase.from('profiles').select('full_name, phone, role').eq('id', user.id).maybeSingle()
  if (!data) return null

  return {
    fullName: data.full_name,
    // '' rather than null so the value can go straight into a controlled
    // input without a per-field ?? '' at every call site.
    phone: data.phone ?? '',
    email: user.email ?? '',
    role: data.role,
    canChangePassword: (user.identities ?? []).some((identity) => identity.provider === 'email'),
  }
}

export async function updateMyProfile(formData: FormData): Promise<{ error: string } | { success: true }> {
  const fullName = String(formData.get('fullName') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()

  if (!fullName) {
    return { error: '이름을 입력해주세요.' }
  }

  const supabase = await createClient()
  // Not `.from('profiles').update(...)`: the table-level UPDATE grant is
  // revoked for `authenticated` on purpose (20260724100006 -- a blanket
  // update surface let a caller rewrite their own role). update_my_profile
  // (20260803000000) is the narrow replacement, with the column list fixed
  // in the function body.
  const { error } = await supabase.rpc('update_my_profile', {
    p_full_name: fullName,
    p_phone: phone,
  })

  if (error) {
    // The RPC's own guards. Anything else is genuinely unexpected, so its
    // message is surfaced rather than swallowed into a generic string.
    if (error.message.includes('full_name_required')) return { error: '이름을 입력해주세요.' }
    if (error.message.includes('profile_not_found')) return { error: '프로필을 찾을 수 없습니다.' }
    return { error: error.message }
  }

  // The name shows up outside this screen (the instructor picker, the roster
  // tables), so the cached shells for those routes have to be dropped too.
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function changeMyPassword(formData: FormData): Promise<{ error: string } | { success: true }> {
  const currentPassword = String(formData.get('currentPassword') ?? '')
  const newPassword = String(formData.get('newPassword') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '')

  if (!currentPassword || !newPassword) {
    return { error: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.' }
  }
  if (newPassword.length < 8) {
    return { error: '새 비밀번호는 8자 이상이어야 합니다.' }
  }
  if (newPassword !== confirmPassword) {
    return { error: '새 비밀번호가 서로 일치하지 않습니다.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    return { error: '비밀번호를 변경할 수 없는 계정입니다.' }
  }

  // Supabase lets a valid session change the password without re-stating the
  // old one. That means a session someone else got hold of -- a shared or
  // unattended device, the most likely case for a studio tablet -- can lock
  // the real owner out permanently. Re-verifying costs one round trip and
  // closes that. It signs the same user back in, so the session that comes
  // back is theirs.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (reauthError) {
    return { error: '현재 비밀번호가 올바르지 않습니다.' }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
