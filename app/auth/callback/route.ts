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
  // The cookie (maxAge 600s, browser-local) is the fast path but isn't
  // device- or time-durable -- already gone by the time this route runs
  // whenever the confirmation email is opened later than 10 minutes after
  // signup or on a different device (e.g. tapped from a phone's mail app),
  // both ordinary for async email. Fall back to user_metadata's own
  // invite_code (stashed by acceptInviteWithPassword's signUp() call, see
  // lib/actions/invites.ts -- device-independent and non-expiring) in that
  // case. accept_invite below still independently validates the code is
  // real/unused/unexpired server-side regardless of which path supplied it,
  // so this user-writable metadata field confers no new privilege.
  const pendingInviteCode = cookieStore.get('pending_invite_code')?.value ?? user.user_metadata?.invite_code

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
    // accept_invite just consumed this code -- clear the durability fallback
    // acceptInviteWithPassword's signUp() call stashed in user_metadata (see
    // lib/actions/invites.ts), so it doesn't sit on this auth.users row
    // forever. Left in place, it can resurface on a later, unrelated
    // authentication (e.g. a Kakao identity getting linked to this same
    // verified email) that reaches the `if (profile) { if (pendingInviteCode)
    // ... }` branch above with no fresh cookie, misrouting an ordinary
    // sign-in to a stale "profile_already_exists" invite-error page instead
    // of home. `data` merges into user_metadata rather than replacing it, and
    // `invite_code: null` deletes just that key, so `name` and anything else
    // stashed there survives. Best-effort and non-blocking (.catch swallows
    // it): accept_invite above already succeeded -- that's the actual state
    // change for this request -- so a failure clearing this hygiene field
    // shouldn't strand the user mid-redirect.
    //
    // acceptInviteWithPassword's *other* branch (session established
    // immediately -- local Supabase CLI's default, confirmations disabled)
    // calls accept_invite directly and never reaches this route at all, so it
    // has the identical staleness gap, unaddressed here.
    await supabase.auth.updateUser({ data: { invite_code: null } }).catch(() => {})
    return NextResponse.redirect(`${origin}/`)
  }

  return NextResponse.redirect(`${origin}/onboarding/studio-name`)
}
