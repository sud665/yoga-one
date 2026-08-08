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

// 이메일 찾기: matches full_name + phone against public.profiles via the
// anon-callable find_email_by_name_phone RPC (20260805000000), which already
// masks the result server-side -- this action never sees (or could leak) the
// unmasked email. A null RPC result covers both "no such person" and "found,
// but the studio never has demo/real data for this name+phone pair" with the
// same generic message the design calls for, rather than distinguishing them
// and handing an attacker a name/phone oracle one bit at a time.
export async function findEmailByNamePhone(formData: FormData): Promise<{ error: string } | { email: string }> {
  const fullName = String(formData.get('fullName') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  if (!fullName || !phone) {
    return { error: '이름과 전화번호를 입력해주세요.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('find_email_by_name_phone', {
    p_full_name: fullName,
    p_phone: phone,
  })
  if (error || !data) {
    return { error: '일치하는 계정을 찾을 수 없습니다.' }
  }
  return { email: data }
}

// 비밀번호 찾기: resetPasswordForEmail doesn't error for an unregistered
// email (Supabase's own anti-enumeration default -- it only actually sends
// mail when an account exists, but reports success either way), and this
// action deliberately doesn't second-guess that by checking existence itself
// first. redirectTo points at /auth/reset, a route dedicated to recovery-code
// exchange -- not /auth/callback, whose profile-exists branch would redirect
// an already-onboarded user straight to '/' and never reach the
// new-password screen at all.
export async function requestPasswordReset(formData: FormData): Promise<{ error: string } | { sent: true; email: string }> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) {
    return { error: '이메일을 입력해주세요.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset`,
  })
  if (error) {
    return { error: error.message }
  }
  return { sent: true, email }
}

// 비밀번호 재설정: relies on the recovery session /auth/reset/route.ts just
// established from the emailed link's code -- updateUser() acts on whatever
// session is in the request's cookies, no separate token param needed here.
// Doesn't attempt the mockup copy's "다르게 설정해주세요" (must differ from
// the old password): there is no old password to compare against in a
// recovery flow (the user forgot it), and Supabase exposes no way to check a
// candidate against the previous hash without actually committing a change
// first. Treated as advisory copy, not an enforceable rule.
export async function updatePasswordAfterReset(formData: FormData): Promise<{ error: string } | { success: true }> {
  const password = String(formData.get('password') ?? '')
  const passwordConfirm = String(formData.get('passwordConfirm') ?? '')

  if (password.length < 8) {
    return { error: '비밀번호는 8자 이상이어야 합니다.' }
  }
  if (password !== passwordConfirm) {
    return { error: '비밀번호가 일치하지 않습니다.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    return { error: mapUpdatePasswordError(error.message) }
  }
  return { success: true }
}

// updateUser() acts on the recovery session /auth/reset/route.ts should have
// already established -- if that never happened (the reset link expired,
// was already used, or this page was opened directly with no session at
// all), supabase-js's raw error is the English "Auth session missing!",
// which reached the page verbatim before this mapping existed (QA sweep
// 2026-08-08, item 9). That's the one failure mode reachable through normal
// use (an expired/reused link), so it gets a specific, actionable message;
// anything else falls back to the raw message same as elsewhere in this file.
function mapUpdatePasswordError(message: string): string {
  if (message.includes('Auth session missing')) {
    return '재설정 링크가 만료되었거나 이미 사용되었습니다. 비밀번호 찾기를 다시 시도해주세요.'
  }
  return message
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
