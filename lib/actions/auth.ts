'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function signUpOwnerWithPassword(formData: FormData) {
  const studioName = String(formData.get('studioName') ?? '').trim()
  const fullName = String(formData.get('fullName') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!studioName || !fullName || !email || !password) {
    return { error: '모든 항목을 입력해주세요.' }
  }

  const supabase = await createClient()
  const { error: signUpError } = await supabase.auth.signUp({ email, password })
  if (signUpError) {
    return { error: signUpError.message }
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
