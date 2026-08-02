'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function signUpOwnerWithPassword(
  formData: FormData
): Promise<{ error: string } | { pendingConfirmation: true }> {
  const studioName = String(formData.get('studioName') ?? '').trim()
  const fullName = String(formData.get('fullName') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!studioName || !fullName || !email || !password) {
    return { error: '모든 항목을 입력해주세요.' }
  }

  const supabase = await createClient()
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Same mechanism as acceptInviteWithPassword below and
      // signInWithKakao's existing OAuth redirect: only meaningful when
      // hosted email confirmations are on (locally disabled per
      // supabase/config.toml).
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      // Picked up by /auth/callback's existing
      // `user.user_metadata?.name ?? '원장'` fallback when it resumes
      // create_studio_and_owner_profile below, so the resumed profile gets
      // the name actually typed into this form instead of the generic default.
      data: { name: fullName },
    },
  })
  if (signUpError) {
    return { error: signUpError.message }
  }

  if (!signUpData.session) {
    // Local Supabase CLI defaults auth.email.enable_confirmations to false,
    // but hosted Supabase defaults it to true -- if the production project
    // has it on, signUp() returns a user with no session and no error.
    // Calling create_studio_and_owner_profile below would then run as `anon`
    // and fail. Persist the studio name via the same pending_studio_name
    // cookie signInWithKakao already establishes for its OAuth redirect, so
    // /auth/callback's existing resume logic creates the studio once a real
    // session exists (whether the caller arrives via Kakao or email
    // confirmation), and tell the user to check their email instead of
    // attempting (and failing) the RPC here.
    const cookieStore = await cookies()
    cookieStore.set('pending_studio_name', studioName, { maxAge: 600, httpOnly: true })
    return { pendingConfirmation: true }
  }

  const { error: rpcError } = await supabase.rpc('create_studio_and_owner_profile', {
    p_studio_name: studioName,
    p_full_name: fullName,
  })
  if (rpcError) {
    return { error: rpcError.message }
  }

  redirect('/admin')
}

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
  }

  redirect('/')
}

export async function signInWithKakao(options?: { pendingStudioName?: string; pendingInviteCode?: string }) {
  const supabase = await createClient()
  const cookieStore = await cookies()

  if (options?.pendingStudioName) {
    cookieStore.set('pending_studio_name', options.pendingStudioName, { maxAge: 600, httpOnly: true })
  }
  if (options?.pendingInviteCode) {
    cookieStore.set('pending_invite_code', options.pendingInviteCode, { maxAge: 600, httpOnly: true })
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  })

  if (error || !data.url) {
    redirect('/login?kakaoError=1')
  }

  redirect(data.url)
}
