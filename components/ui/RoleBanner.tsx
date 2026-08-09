import { createClient } from '@/lib/supabase/server'
import type { ProfileRole } from '@/lib/types'

const ROLE_LABEL: Record<ProfileRole, string> = { owner: '원장', instructor: '강사', member: '회원' }

// 최상단 역할 표시줄. 세 역할이 같은 로그인 폼과 거의 같은 셸을 공유하다 보니
// 지금 어떤 계정으로 들어와 있는지 화면만 보고는 구분이 안 됐다(특히 원장이
// 강사 화면(/instructor)까지 오가는 경우). 각 역할 레이아웃이 main 위에
// 하나씩 렌더한다 -- async 서버 컴포넌트라 레이아웃 쪽에는 한 줄만 추가되고,
// 동기 레이아웃(admin/member)을 async로 바꿀 필요도 없다.
//
// 프로필이 없으면(비로그인이 공개 경로를 거쳐 온 경우 등) 아무것도 그리지
// 않는다 -- proxy.ts가 역할 라우트를 이미 지키고 있으므로 여기서 또 막을
// 일은 없고, 배너는 순수 표시 장치다.
export async function RoleBanner() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, studio:studios(name)')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile) return null

  return (
    <div className="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-hairline bg-surface px-4">
      <span className="truncate text-caption text-muted">{profile.studio?.name}</span>
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="rounded-full bg-brand-tint px-2 py-0.5 text-utility-xs text-brand-deep">
          {ROLE_LABEL[profile.role]}
        </span>
        <span className="text-caption text-ink">{profile.full_name}님</span>
      </span>
    </div>
  )
}
