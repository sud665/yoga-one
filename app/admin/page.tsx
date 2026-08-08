'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard } from 'lucide-react'
import { getDashboardSummary } from '@/lib/actions/dashboard'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { ScheduleIcon, InstructorIcon, MembersIcon, InviteIcon } from './admin-nav'

// DESIGN.md `quick-action-card`: 원장 대시보드의 바로가기(강사관리·회원관리·
// 시간표관리 진입 카드). DESIGN.md에 스펙만 있고 실제 구현은 없던 컴포넌트라
// 이 페이지가 첫 실현이다. 초대관리는 DESIGN.md가 명시한 세 예시(강사·회원·
// 시간표관리)에 이어 자연스러운 네 번째 항목으로 추가했다 -- 사이드바
// (admin-nav.tsx)와 정확히 같은 아이콘을 재사용해 두 화면이 같은 시각
// 어휘를 쓰는 하나의 시스템으로 읽히게 한다.
const QUICK_ACTIONS = [
  { href: '/admin/schedule', label: '시간표관리', icon: ScheduleIcon },
  { href: '/admin/roster/instructors', label: '강사관리', icon: InstructorIcon },
  { href: '/admin/roster/members', label: '회원관리', icon: MembersIcon },
  { href: '/admin/invites', label: '초대관리', icon: InviteIcon },
] as const

export default function AdminDashboardPage() {
  // 초기값을 {todaySessionCount:0, waitlistedCount:0}이 아니라 null로 둔다 --
  // 이전 버전은 로딩 중에도 항상 "오늘 수업 0건"을 렌더했다가 실제 값으로
  // 바뀌는 깜빡임이 있었다. null인 동안 Skeleton을 보여주는 쪽이 Adjustment
  // #3가 요구하는 로딩 패턴에 맞고, 실제로 그 깜빡임 버그도 없앤다.
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getDashboardSummary>> | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .catch(() => {
        // Adjustment #3의 토스트 패턴을 쓰는 첫 실제 사례: 이 fetch는
        // 원래 실패를 전혀 다루지 않았다(에러 발생 시 그냥 조용히 아무 일도
        // 일어나지 않은 것처럼 보였다) -- member/bookings 페이지의
        // cancel_booking 에러 처리와 같은 이유로, 조용한 실패는 버그다.
        toast({
          title: '대시보드를 불러오지 못했습니다',
          description: '잠시 후 새로고침해 주세요.',
          tone: 'error',
        })
      })
  }, [toast])

  return (
    <div className="w-full px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-brand-tint">
          <LayoutDashboard className="h-[19px] w-[19px] text-brand-deep" strokeWidth={1.75} />
        </span>
        <h1 className="text-heading-lg text-ink">원장 대시보드</h1>
      </div>

      {/* DESIGN.md `dashboard-summary-card` -- ink 배경 + on-ink 텍스트 +
          heading-lg급 숫자(card-ink 컴포넌트의 명시 타이포그래피). 이전에는
          페이지마다 `rounded-none bg-black`을 직접 반복했는데, 이제
          Card(variant="brand")로 대체해 다른 화면도 같은 요약카드를 재사용할
          수 있다. rounded-card가 적용되어 완전 각진 처리 대신 14px 라운드를
          쓴다. */}
      <div className="flex flex-col gap-4" aria-live="polite">
        {summary === null ? (
          <>
            <Skeleton variant="block" className="h-24 flex-1" />
            <Skeleton variant="block" className="h-24 flex-1" />
          </>
        ) : (
          <>
            {/* Only the first stat gets the brand fill. Two filled blocks
                side by side spend the screen's whole voltage budget on a
                pair of numbers and leave neither looking primary --
                DESIGN.md's "전압은 희소해야 신호가 된다". Today's class
                count is what an owner opens this page for; the waitlist
                count is context. */}
            <Card variant="brand" className="flex-1">
              <p className="text-caption text-on-brand/70">오늘 수업</p>
              <p className="text-heading-lg">{summary.todaySessionCount}건</p>
            </Card>
            <Card className="flex-1">
              <p className="text-caption text-muted">대기중인 예약</p>
              <p className="text-heading-lg text-ink">{summary.waitlistedCount}건</p>
            </Card>
          </>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 rounded-card border border-hairline bg-surface px-4 py-6 text-center text-caption text-ink shadow-elev-1 transition-colors hover:bg-surface-soft"
            >
              <Icon aria-hidden="true" className="h-5 w-5 text-muted" strokeWidth={1.75} />
              {action.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
