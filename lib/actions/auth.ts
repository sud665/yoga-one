'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { roleHomePath } from '@/lib/role-home'

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
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
  }

  // Straight to the role's home, not to '/'. Bouncing through the root worked
  // in the sense that the right screen rendered, but the address bar stayed on
  // '/' the whole time: a server-action redirect is resolved inside the Next
  // server, so the second redirect (app/page.tsx -> /admin) streams the target
  // page without the browser ever performing the navigation that would update
  // the URL. Deciding here removes the hop entirely. app/page.tsx keeps its
  // own routing for anything else that lands on the root.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()

  redirect(profile ? roleHomePath(profile.role) : '/')
}

// Clears the Supabase session cookies and drops the caller back at /login.
// The app shipped without any way to sign out at all -- accept_invite's
// `profile_already_exists` message even tells the user to "로그아웃 후 다시
// 시도해주세요", advice nothing in the UI could act on.
//
// redirect() is deliberately outside the try/catch shape used elsewhere in
// this file: Next implements it by throwing, so wrapping it swallows the
// navigation. supabase.auth.signOut() failing is not worth blocking on either
// -- the session cookies are cleared either way, so the user still ends up
// signed out locally.
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function signInWithKakao(options?: {
  pendingStudioName?: string
  pendingInviteCode?: string
  // Which page to bounce back to if the OAuth handshake itself fails to even
  // start (signInWithOAuth erroring or returning no redirect URL -- not the
  // later /auth/callback failures, which don't know which of the 3 role
  // login pages the attempt started from and always fall back to the plain
  // /login chooser). Defaults to that same chooser for callers that don't care.
  errorRedirectTo?: string
}) {
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
    redirect(`${options?.errorRedirectTo ?? '/login'}?kakaoError=1`)
  }

  redirect(data.url)
}
