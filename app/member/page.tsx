import { CalendarDays, Clock } from 'lucide-react'

import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getMemberDashboard } from '@/lib/actions/dashboard'
import { getMyProfile } from '@/lib/actions/profile'
import { kstToday } from '@/lib/date'
import { daysBetween, periodLabel } from '@/lib/period'

// A server component, unlike the three list screens beside it. Those need
// client state because they book, cancel, and filter; this one only reads, so
// rendering it on the server skips the mount-then-fetch skeleton flash
// entirely. bookSession/cancelBooking already revalidate the member routes,
// which is what keeps it current after an action taken elsewhere.

function dday(date: string): string {
  const diff = daysBetween(kstToday(), date)
  if (diff === 0) return '오늘'
  if (diff === 1) return '내일'
  return `D-${diff}`
}

export default async function MemberHomePage() {
  const [profile, dashboard] = await Promise.all([getMyProfile(), getMemberDashboard()])
  const { nextSession, weekBookedCount, waitlistedCount } = dashboard

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-heading-lg text-ink">
          {profile ? `안녕하세요, ${profile.fullName}님` : '안녕하세요'}
        </h1>
        <p className="mt-1 text-caption text-muted">{periodLabel(kstToday(), 'day')}</p>
      </header>

      {/* The screen's one voltage surface (DESIGN.md: 화면당 최대 1-2개). A
          member opens this app to answer "when am I next in class", so that
          answer gets the brand fill and everything below it stays quiet. */}
      {nextSession ? (
        <Card variant="brand">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-caption text-on-brand/70">다음 수업</p>
              <p className="mt-1 text-heading-lg">{nextSession.title}</p>
            </div>
            {/* The badge sits on a filled surface, where the tinted
                StatusBadge would fight the fill -- an outlined chip in the
                same on-brand ink reads as part of the card instead. */}
            <span className="rounded-full border border-on-brand/30 px-3 py-1 text-caption text-on-brand">
              {nextSession.status === 'booked' ? '예약완료' : '대기중'}
            </span>
          </div>

          {/* Three facts on one row rather than three stacked lines: the
              countdown is what the eye lands on, the date and time qualify
              it, and the instructor is the last thing anyone reads. */}
          <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-display-lg">{dday(nextSession.date)}</span>
            <span className="text-body-strong text-on-brand">
              {periodLabel(nextSession.date, 'day')} {nextSession.startTime}
            </span>
            <span className="text-caption text-on-brand/70">{nextSession.instructorName}</span>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col items-start gap-4">
          <div>
            <p className="text-heading-md text-ink">예정된 수업이 없습니다</p>
            <p className="mt-1 text-body-md text-muted">시간표에서 원하는 수업을 예약해보세요.</p>
          </div>
          {/* The glyph goes in as a child, not through Button's `icon` prop.
              This page is a server component and Button is a client one, so
              `icon={CalendarDays}` would hand a function across the RSC
              boundary -- React refuses to serialize it and the whole route
              500s with "Functions cannot be passed directly to Client
              Components". A rendered <CalendarDays /> is an element, which
              serializes fine. Button's own gap-2 spaces it exactly as the
              prop would have. */}
          <Button href="/member/schedule">
            <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            일정 보기
          </Button>
        </Card>
      )}

      {/* Two counts, side by side on anything wider than a phone. Icons
          rather than a second heading each -- at this size the label is
          already short enough to read at a glance, and the glyph is what
          separates the two cards when they sit in a row. */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card className="flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-caption text-muted">
            <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
            이번 주 예약
          </span>
          <span className="text-heading-lg text-ink">{weekBookedCount}건</span>
        </Card>
        <Card className="flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-caption text-muted">
            <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
            대기중
          </span>
          <span className="flex items-center gap-2 text-heading-lg text-ink">
            {waitlistedCount}건
            {/* The badge only appears when there is something to say. A
                waitlisted booking is the one state on this screen a member
                may not know about yet. */}
            {waitlistedCount > 0 && <StatusBadge tone="waitlisted">대기</StatusBadge>}
          </span>
        </Card>
      </div>
    </div>
  )
}
