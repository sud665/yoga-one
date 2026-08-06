import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'
// Shared with app/page.tsx, which has to make the same call for a request
// that reaches '/' without passing through here (a server-action redirect).
import { roleHomePath, type ProfileRole } from '@/lib/role-home'

const PUBLIC_PREFIXES = [
  '/login',
  '/signup',
  '/invite',
  '/auth/callback',
  '/auth/reset',
  '/find-email',
  '/find-password',
  '/reset-password',
  '/onboarding',
  '/error',
]

// Only an owner gets a second allowed prefix. The design spec explicitly
// supports an owner who teaches their own classes in a small studio
// ("원장이 직접 수업을 진행하는 소규모 요가원을 지원하기 위함"), and
// lib/actions/schedule.ts's listInstructors() already lets an owner assign
// themselves as a session's instructor_id -- mark_attendance and the
// "bookings: instructor views own session bookings" RLS policy already
// authorize an owner acting on their own assigned sessions. Without this, an
// owner assigned as instructor had no route to reach an attendance screen at
// all: this was purely a routing gap, not a data/RLS one. Instructor/member
// confinement is unchanged -- only owners gain the extra allowed prefix.
function allowedPathPrefixes(role: ProfileRole) {
  const home = roleHomePath(role)
  return role === 'owner' ? [home, '/instructor'] : [home]
}

export async function proxy(request: NextRequest) {
  const { supabase, getResponse } = createMiddlewareClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))

  function redirect(url: string) {
    const redirectResponse = NextResponse.redirect(new URL(url, request.url))
    getResponse().cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie))
    return redirectResponse
  }

  if (!user) {
    if (isPublic) return getResponse()
    return redirect('/login')
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()

  if (!profile) {
    if (isPublic) return getResponse()
    // A pending invite code (set by acceptInviteWithPassword/signInWithKakao
    // when signUp() couldn't establish a session immediately -- hosted email
    // confirmations, see lib/actions/invites.ts) means this authenticated,
    // profile-less user is mid-invite-acceptance, not a brand-new owner.
    // Defaulting straight to owner onboarding here would let them silently
    // become the OWNER of a new studio instead of resuming their invite,
    // inverting the "no signup without a valid invite" invariant. Route them
    // back to the invite page instead so they can complete acceptance.
    //
    // The cookie is the fast path but isn't device- or time-durable: maxAge
    // 600s (10 min) and browser-local, so it's already gone by the time this
    // runs whenever the confirmation email is opened later than that or on a
    // different device (e.g. tapped from a phone's mail app) -- both
    // ordinary for async email, unlike the Kakao OAuth round-trip this
    // cookie mechanism was originally built for. Fall back to
    // user_metadata's own invite_code (stashed by acceptInviteWithPassword's
    // signUp() call, see lib/actions/invites.ts -- device-independent and
    // non-expiring) in that case. accept_invite still independently
    // validates the code is real/unused/unexpired server-side regardless of
    // which path supplied it, so this user-writable metadata field confers
    // no new privilege.
    const pendingInviteCode = request.cookies.get('pending_invite_code')?.value ?? user.user_metadata?.invite_code
    if (pendingInviteCode) {
      return redirect(`/invite/${pendingInviteCode}`)
    }
    return redirect('/onboarding/studio-name')
  }

  const allowedPrefixes = allowedPathPrefixes(profile.role)
  if (!isPublic && !allowedPrefixes.some((prefix) => path.startsWith(prefix))) {
    return redirect(roleHomePath(profile.role))
  }

  return getResponse()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js).*)'],
}
