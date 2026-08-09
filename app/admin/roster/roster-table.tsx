'use client'

import { useState, useEffect } from 'react'
import { listProfilesByRole } from '@/lib/actions/roster'
import { createInvite } from '@/lib/actions/invites'
import type { Profile } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { Plus, UserRound, UsersRound } from 'lucide-react'

// One shared component for both the instructor and member roster screens --
// the two screens are structurally identical (list + invite-issuance
// shortcut) over a different `profiles.role` value, so `role`/`label` are the
// only things that vary between app/admin/roster/instructors/page.tsx and
// app/admin/roster/members/page.tsx.
export function RosterTable({ role, label }: { role: 'instructor' | 'member'; label: string }) {
  const [profiles, setProfiles] = useState<Profile[] | null>(null)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const { toast } = useToast()
  const Icon = role === 'instructor' ? UserRound : UsersRound

  useEffect(() => {
    listProfilesByRole(role).then(setProfiles)
  }, [role])

  async function handleInvite() {
    const result = await createInvite(role)
    if ('url' in result) {
      setGeneratedUrl(result.url)
      return
    }
    // Previously silent: a failed createInvite() (e.g. not signed in as the
    // owner) just did nothing, with zero feedback that the click had any
    // effect at all. Not covered by any Playwright spec (every e2e
    // invite-issuance flow goes through /admin/invites, not this roster
    // shortcut), so wiring this to a toast carries no test risk.
    toast({ title: `${label} 초대 링크를 발급하지 못했습니다`, description: result.error, tone: 'error' })
  }

  return (
    <div className="w-full px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-brand-tint">
          <Icon className="h-[19px] w-[19px] text-brand-deep" strokeWidth={1.75} />
        </span>
        <h1 className="text-heading-lg text-ink">{label} 관리</h1>
      </div>

      <Button icon={Plus} onClick={handleInvite}>{label} 초대 링크 발급</Button>

      {generatedUrl && (
        <p className="mt-6 break-all rounded-card border border-hairline bg-surface px-4 py-3 text-body-md text-ink shadow-elev-1">
          발급된 링크:{' '}
          <a href={generatedUrl} className="text-body-strong text-brand-deep underline">
            {generatedUrl}
          </a>
        </p>
      )}

      {profiles === null ? (
        <div className="mt-10 flex flex-col gap-3">
          <Skeleton variant="block" className="h-14" />
          <Skeleton variant="block" className="h-14" />
        </div>
      ) : profiles.length === 0 ? (
        <EmptyState
          className="mt-10"
          title={`등록된 ${label}이(가) 없습니다`}
          description="위 버튼으로 초대 링크를 발급해보세요."
        />
      ) : (
        // 구분선 리스트 대신 행마다 독립된 흰 카드 -- 회원 관리 목록의 행
        // 카드와 같은 표면·구조(이니셜 아바타 + 이름/연락처 두 줄). 강사
        // 행은 눌러서 열 상세가 없으므로 hover 처리는 없다.
        <ul className="mt-10 flex flex-col gap-2">
          {profiles.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2.5 rounded-card border border-hairline bg-surface px-3.5 py-3 shadow-elev-1"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-caption text-brand-deep">
                {p.full_name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body-strong text-ink">{p.full_name}</span>
                <span className="mt-0.5 block truncate text-caption text-muted">{p.phone ?? '연락처 미등록'}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
