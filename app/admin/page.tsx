'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, LayoutDashboard } from 'lucide-react'
import { getOwnerDashboard, type OwnerDashboardSession } from '@/lib/actions/dashboard'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { kstToday } from '@/lib/date'
import { periodLabel } from '@/lib/period'
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
  // 초기값을 0들로 채운 객체가 아니라 null로 둔다 -- 이전 버전은 로딩
  // 중에도 항상 "오늘 수업 0건"을 렌더했다가 실제 값으로 바뀌는 깜빡임이
  // 있었다. null인 동안 Skeleton을 보여주는 쪽이 Adjustment #3가 요구하는
  // 로딩 패턴에 맞고, 실제로 그 깜빡임 버그도 없앤다.
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getOwnerDashboard>> | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    getOwnerDashboard()
      .then(setDashboard)
      .catch(() => {
        // Adjustment #3의 토스트 패턴: 조용한 실패는 버그다 (member/bookings
        // 페이지의 cancel_booking 에러 처리와 같은 이유).
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

      {dashboard === null ? (
        <div className="flex flex-col gap-4" aria-live="polite">
          <Skeleton variant="block" className="h-24" />
          <Skeleton variant="block" className="h-24" />
          <Skeleton variant="block" className="h-40" />
        </div>
      ) : (
        <div className="flex flex-col gap-4" aria-live="polite">
          {/* DESIGN.md `dashboard-summary-card`. 첫 번째 카드만 brand fill --
              두 개가 나란히 채워지면 화면의 전압 예산을 숫자 한 쌍에 다 쓰고
              어느 쪽도 primary로 읽히지 않는다 ("전압은 희소해야 신호가
              된다"). 두 카드 모두 아래 상세 섹션으로 스크롤 없이 이동할 수
              있게 예약 현황 페이지로 링크한다 -- 숫자만 있고 눌러도 아무
              일도 없던 것이 이 대시보드의 원래 불만이었다. */}
          <Link href="/admin/bookings" aria-label="오늘 수업 자세히 보기 — 예약 현황">
            <Card variant="brand" className="transition-opacity hover:opacity-90">
              <p className="text-caption text-on-brand/70">오늘 수업</p>
              <p className="text-heading-lg">{dashboard.todaySessionCount}건</p>
            </Card>
          </Link>
          <Link href="/admin/bookings" aria-label="대기중인 예약 자세히 보기 — 예약 현황">
            <Card className="transition-colors hover:bg-surface-soft">
              <p className="text-caption text-muted">대기중인 예약</p>
              <p className="text-heading-lg text-ink">{dashboard.waitlistedCount}건</p>
            </Card>
          </Link>

          <SectionHeader title="오늘 수업" />
          {dashboard.todaySessions.length === 0 ? (
            <Card>
              <p className="text-body-strong text-ink">오늘은 예정된 수업이 없습니다</p>
              <p className="mt-1 text-body-md text-muted">시간표관리에서 반복 시간표를 등록해보세요.</p>
            </Card>
          ) : (
            <ul className="flex flex-col gap-2">
              {dashboard.todaySessions.map((s) => (
                <SessionRow key={s.id} session={s} />
              ))}
            </ul>
          )}

          {/* 대기자가 없으면 섹션 자체를 접는다 -- 위 요약 카드가 이미
              "대기중인 예약 0건"이라고 말하고 있어서, 빈 목록 섹션은 같은
              말을 두 번 하는 노이즈다. */}
          {dashboard.waitlistedSessions.length > 0 && (
            <>
              <SectionHeader title="대기중인 예약" />
              <ul className="flex flex-col gap-2">
                {dashboard.waitlistedSessions.map((s) => (
                  <SessionRow key={s.id} session={s} showDate />
                ))}
              </ul>
            </>
          )}
        </div>
      )}

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

// 섹션 제목 + "예약 현황" 진입 링크. 상세(명단·회원 추가·기간 필터)는 전부
// /admin/bookings의 일이고 대시보드는 그 요약이라, 모든 섹션의 목적지가
// 같다.
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mt-4 flex items-baseline justify-between">
      <h2 className="text-heading-md text-ink">{title}</h2>
      <Link href="/admin/bookings" className="flex items-center gap-0.5 text-caption text-brand-deep">
        예약 현황
        <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
      </Link>
    </div>
  )
}

// 한 세션 = 한 행 카드. 예약 현황 페이지의 세션 카드에서 명단을 뺀 요약
// 형태 -- 시간이 행의 앵커(원장이 오늘 목록을 훑는 축), 정원 뱃지의
// tone 규칙(가득 danger / 여유 success)은 그 페이지와 동일해서 두 화면이
// 같은 언어로 읽힌다.
function SessionRow({ session: s, showDate = false }: { session: OwnerDashboardSession; showDate?: boolean }) {
  const isFull = s.bookedCount >= s.capacity
  return (
    <li>
      <Link
        href="/admin/bookings"
        className="flex items-center gap-3 rounded-card border border-hairline bg-surface px-3.5 py-3 shadow-elev-1 transition-colors hover:bg-surface-soft"
      >
        <span className="shrink-0 text-body-strong text-brand-deep">{s.startTime ?? '--:--'}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body-strong text-ink">{s.title ?? '수업'}</span>
          <span className="mt-0.5 block truncate text-caption text-muted">
            {showDate && s.date !== kstToday() ? `${periodLabel(s.date, 'day')} · ` : ''}
            {s.instructorName ?? '강사 미배정'}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <StatusBadge tone={isFull ? 'danger' : 'success'}>
            {s.bookedCount}/{s.capacity}
          </StatusBadge>
          {s.waitlistedCount > 0 && <StatusBadge tone="waitlisted">대기 {s.waitlistedCount}</StatusBadge>}
        </span>
      </Link>
    </li>
  )
}
