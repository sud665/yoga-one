import { createClient } from '@/lib/supabase/server'
import { InstructorNav } from './instructor-nav'

// Now async: needs the caller's own role (not just "are they allowed here",
// which proxy.ts already decided) to tell InstructorNav whether to render its
// owner-only 관리자 tab. See instructor-nav.tsx's own comment for why an
// owner reaching this layout at all had no way back to /admin before this.
export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    : { data: null }

  return (
    <div data-role="instructor" className="flex h-full flex-col">
      {/* main first, nav second -- see app/member/layout.tsx for why. */}
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      <InstructorNav isOwner={profile?.role === 'owner'} />
    </div>
  )
}
