import { createClient } from '@/lib/supabase/server'
import { RoleBanner } from '@/components/ui/RoleBanner'
import { AdminNav } from '@/app/admin/admin-nav'
import { MemberNav } from '@/app/member/member-nav'
import { InstructorNav } from '@/app/instructor/instructor-nav'
import type { ProfileRole } from '@/lib/types'

// /notices sits outside every role's own route tree (proxy.ts adds it to
// allowedPathPrefixes as a shared prefix for all three roles, the way
// e.g. /admin/notices already gets in for free under owner's own /admin
// prefix) -- which also means it never picks up app/admin/layout.tsx's,
// app/member/layout.tsx's, or app/instructor/layout.tsx's bottom nav. A
// visitor landing here from any role had no way back to their own tab bar
// short of the browser's back button (QA sweep 2026-08-08, item 12). This
// layout looks up the caller's own role and renders the matching nav, same
// <main>{children}</main> + nav arrangement every other role layout uses.
const NAV_BY_ROLE: Record<ProfileRole, React.ComponentType> = {
  owner: AdminNav,
  instructor: InstructorNav,
  member: MemberNav,
}

export default async function NoticesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    : { data: null }

  const Nav = profile ? NAV_BY_ROLE[profile.role] : null

  return (
    <div className="flex h-full flex-col">
      {/* 역할 표시줄 -- see components/ui/RoleBanner.tsx. */}
      <RoleBanner />
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      {Nav && <Nav />}
    </div>
  )
}
