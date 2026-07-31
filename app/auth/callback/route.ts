import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?kakaoError=1`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/login?kakaoError=1`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login?kakaoError=1`)
  }

  // Read pending-invite cookies before the profile check below (not just
  // after): an already-registered user (e.g. someone from Studio A) who
  // clicks a Kakao invite link for Studio B re-authenticates into their
  // *existing* account here, so the profile check below fires for them too.
  // Without the pending invite code in hand at that point, they'd get
  // silently bounced to `/` with no sign their invite click did anything.
  const cookieStore = await cookies()
  const pendingStudioName = cookieStore.get('pending_studio_name')?.value
  const pendingInviteCode = cookieStore.get('pending_invite_code')?.value

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile) {
    if (pendingInviteCode) {
      // Mirrors accept_invite's own rejection for this same situation (see
      // the pendingInviteCode branch below) so the invite page renders the
      // exact same friendly message via its existing describeInviteError
      // mapping, instead of the user landing on `/` with no explanation.
      cookieStore.delete('pending_invite_code')
      return NextResponse.redirect(
        `${origin}/invite/${pendingInviteCode}?error=${encodeURIComponent('profile_already_exists')}`
      )
    }
    return NextResponse.redirect(`${origin}/`)
  }

  if (pendingStudioName) {
    cookieStore.delete('pending_studio_name')
    const { error: rpcError } = await supabase.rpc('create_studio_and_owner_profile', {
      p_studio_name: pendingStudioName,
      p_full_name: user.user_metadata?.name ?? '원장',
    })
    if (rpcError) {
      return NextResponse.redirect(`${origin}/login?signupError=1`)
    }
    return NextResponse.redirect(`${origin}/admin`)
  }

  if (pendingInviteCode) {
    cookieStore.delete('pending_invite_code')
    const { error } = await supabase.rpc('accept_invite', {
      p_code: pendingInviteCode,
      p_full_name: user.user_metadata?.name ?? '신규 사용자',
    })
    if (error) {
      return NextResponse.redirect(`${origin}/invite/${pendingInviteCode}?error=${encodeURIComponent(error.message)}`)
    }
    return NextResponse.redirect(`${origin}/`)
  }

  return NextResponse.redirect(`${origin}/onboarding/studio-name`)
}
