import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { roleHomePath } from '@/lib/role-home'

// The root route is a router, not a screen. It shipped as the untouched
// create-next-app template, which nobody noticed because no path in the app
// rendered it: every spec goes straight to a role route, and signup redirects
// to /admin itself. Signing in through /login does land here though --
// signInWithPassword ends in redirect('/') -- and a server-action redirect is
// resolved inside the Next server, so middleware.ts never gets a chance to
// bounce it the way it does a normal browser navigation. The user was left
// looking at "To get started, edit the page.tsx file."
//
// Deciding here instead of changing that redirect target fixes the whole
// class: any future path that lands on '/' now ends up somewhere real.
export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  // No profile means mid-onboarding. Middleware has a richer version of this
  // branch (it resumes a pending invite before falling back to owner
  // onboarding), and it runs first on any real navigation to '/', so this is
  // the last-resort default rather than a second implementation of that rule.
  if (!profile) redirect('/onboarding/studio-name')

  redirect(roleHomePath(profile.role))
}
