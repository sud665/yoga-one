import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Dedicated recovery-code exchange, deliberately separate from
// /auth/callback: that route's `if (profile) { ... return redirect('/') }`
// branch would swallow a password-reset attempt from any already-onboarded
// user -- the normal case for "I forgot my password" -- sending them home
// instead of to the new-password screen. This route does exactly one thing:
// exchange the emailed link's code for a session, then hand off to
// /reset-password, which does the actual updateUser({ password }) call.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/find-password?resetError=1`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/find-password?resetError=1`)
  }

  return NextResponse.redirect(`${origin}/reset-password`)
}
