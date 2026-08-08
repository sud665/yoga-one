import Link from 'next/link'
import { CalendarDays, Clock, Megaphone } from 'lucide-react'

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
    <div className="w-full px-6 py-12">
      <header className="mb-8 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Personal, not a generic page-header badge -- DESIGN.md's Icons
              section calls this screen the one exception: it needs to say
              "this is your screen", not "this screen is about X", so it
              gets the signed-in member's own initial instead of a glyph. */}
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-tint text-label text-brand-deep">
            {(profile?.fullName ?? ' ').slice(0, 1)}
          </span>
          <div>
            <h1 className="text-heading-lg text-ink">
              {profile ? `${profile.fullName}님, 반가워요` : '반가워요'}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-caption text-muted">
              <CalendarDays aria-hidden="true" className="h-3 w-3 shrink-0" strokeWidth={2} />
              {periodLabel(kstToday(), 'day')}
            </p>
          </div>
        </div>
        <Link
          href="/notices"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-button border border-hairline px-3 text-label text-ink hover:bg-surface-soft"
        >
          <Megaphone aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.75} />
          공지사항
        </Link>
      </header>

      {/* The screen's one voltage surface (DESIGN.md: 화면당 최대 1-2개). A
          member opens this app to answer "when am I next in class", so that
          answer gets the brand fill and everything below it stays quiet. */}
      {nextSession ? (
        <Card variant="brand" className="relative overflow-hidden">
          {/* Hairline-on-fill ring, on-brand at 10% -- the one place a
              border reads on top of a filled surface instead of replacing
              it. Matches the source design's own brand card exactly. */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-card border border-on-brand/10" />
          <div className="flex items-center justify-between gap-3">
            <p className="text-utility-xs font-semibold tracking-wide text-on-brand/60">다음 수업</p>
            {/* The badge sits on a filled surface, where the tinted
                StatusBadge would fight the fill -- a soft on-brand wash
                reads as part of the card instead. */}
            <span className="rounded-full bg-on-brand/15 px-2.5 py-1 text-utility-xs font-semibold text-on-brand/90">
              {nextSession.status === 'booked' ? '예약완료' : '대기중'}
            </span>
          </div>

          {/* The countdown is what the eye lands on -- dominant figure and
              title share one baseline, date/time/instructor move to their
              own row below a hairline divider rather than crowding the
              same line. */}
          <div className="mt-3.5 flex flex-wrap items-baseline gap-2.5">
            <span className="text-display-lg">{dday(nextSession.date)}</span>
            <span className="text-heading-md text-on-brand/95">{nextSession.title}</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-on-brand/15 pt-3.5 text-label text-on-brand/80">
            <span>
              {periodLabel(nextSession.date, 'day')} {nextSession.startTime}
            </span>
            <span aria-hidden="true" className="h-2.5 w-px bg-on-brand/25" />
            <span>{nextSession.instructorName}</span>
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
