import { createClient } from '@/lib/supabase/server'
import { InstructorNav } from './instructor-nav'
import { RoleBanner } from '@/components/ui/RoleBanner'

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
      {/* 역할 표시줄 -- see components/ui/RoleBanner.tsx. 원장이 자기 수업
          때문에 이 셸로 넘어와도 배너는 '원장'을 유지하므로, 지금 어느
          계정인지가 화면 최상단에서 바로 구분된다. */}
      <RoleBanner />
      {/* main first, nav second -- see app/member/layout.tsx for why. */}
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      <InstructorNav isOwner={profile?.role === 'owner'} />
    </div>
  )
}
