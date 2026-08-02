'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { listMySessionsWithBookings, markAttendance } from '@/lib/actions/attendance'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PeriodFilter } from '@/components/ui/PeriodFilter'
import { usePeriodFilter } from '@/lib/use-period-filter'
import { Check, X } from 'lucide-react'
import { SignOutFooter } from '@/components/ui/SignOutButton'

export default function InstructorHomePage() {
  // `any[]`가 아니라 listMySessionsWithBookings()의 실제 반환 타입을 그대로 쓴다 --
  // app/member/bookings/page.tsx가 listMyBookings()에 쓰는 것과 동일한 관용구
  // (`Awaited<ReturnType<typeof ...>>`)로, 새 타입을 export하지 않고도 any를 피한다.
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof listMySessionsWithBookings>> | null>(null)
  const period = usePeriodFilter()

  const refresh = useCallback(() => {
    listMySessionsWithBookings().then(setSessions)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleMark(bookingId: string, status: 'attended' | 'no_show') {
    await markAttendance(bookingId, status)
    refresh()
  }

  const visible = sessions === null ? null : period.filter(sessions, (s) => s.date)
  // Dots go on every day that has something, not just the days that
  // survive the current filter -- otherwise selecting a day would erase
  // the marks that show where the other days are.
  const datesWithItems = useMemo(
    () => Array.from(new Set((sessions ?? []).map((s) => s.date).filter((d): d is string => Boolean(d)))),
    [sessions]
  )

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="mb-8 text-heading-lg text-ink">내 수업</h1>

      {sessions !== null && sessions.length > 0 && (
        <PeriodFilter
          className="mb-8"
          granularity={period.granularity}
          anchor={period.anchor}
          onGranularityChange={period.setGranularity}
          onAnchorChange={period.setAnchor}
          matchCount={visible?.length}
          view={period.view}
          onViewChange={period.setView}
          datesWithItems={datesWithItems}
        />
      )}

      {visible === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton variant="block" className="h-32" />
          <Skeleton variant="block" className="h-32" />
        </div>
      ) : sessions !== null && sessions.length === 0 ? (
        <EmptyState title="예정된 수업이 없습니다" description="담당 수업이 배정되면 여기에 표시됩니다." />
      ) : visible.length === 0 ? (
        <EmptyState title="이 기간에는 수업이 없습니다" description="기간을 넓히거나 다른 기간을 확인해보세요." />
      ) : (
        visible.map((s) => (
          // Card per session: class name first (what an instructor looks
          // for), date/time as metadata under it, then one row per student
          // with the name on the left and either the attendance verdict or
          // the two marking buttons on the right. The raw enum ('booked')
          // that used to render beside each name is gone -- it was developer
          // vocabulary in a teacher's roster; StatusBadge says it in words.
          <Card key={s.id} className="mb-4 flex flex-col gap-3">
            <div>
              <h2 className="text-heading-md text-ink">{s.template?.title}</h2>
              <p className="mt-0.5 text-caption text-muted">
                {s.date}
                {s.template?.start_time ? ` ${s.template.start_time.slice(0, 5)}` : ''}
              </p>
            </div>
            <ul className="flex flex-col">
              {s.bookings
                .filter((b) => b.status === 'booked' || b.status === 'attended' || b.status === 'no_show')
                .map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline-soft py-3 first:border-t-0"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="text-body-strong text-ink">{b.member?.full_name}</span>
                      {b.status === 'attended' && <StatusBadge tone="success">출석</StatusBadge>}
                      {b.status === 'no_show' && <StatusBadge tone="danger">결석</StatusBadge>}
                    </span>
                    {b.status === 'booked' && (
                      <div className="flex gap-2">
                        <Button icon={Check} onClick={() => handleMark(b.id, 'attended')}>출석</Button>
                        <Button variant="secondary" icon={X} onClick={() => handleMark(b.id, 'no_show')}>
                          결석
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
            </ul>
          </Card>
        ))
      )}
      <SignOutFooter />
    </div>
  )
}
