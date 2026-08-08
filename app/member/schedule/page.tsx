'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import { listUpcomingSessionsWithBookingState, bookSession } from '@/lib/actions/bookings'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { PeriodFilter } from '@/components/ui/PeriodFilter'
import { usePeriodFilter } from '@/lib/use-period-filter'
import { EmptyState } from '@/components/ui/EmptyState'

export default function MemberSchedulePage() {
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof listUpcomingSessionsWithBookingState>> | null>(
    null
  )
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success')
  const period = usePeriodFilter()

  const refresh = useCallback(() => {
    listUpcomingSessionsWithBookingState().then(setSessions)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleBook(sessionId: string) {
    setMessage(null)
    const result = await bookSession(sessionId)
    if ('error' in result) {
      setMessageTone('error')
      setMessage(result.error)
      return
    }
    setMessageTone('success')
    setMessage(result.status === 'booked' ? '예약이 확정되었습니다.' : '정원이 마감되어 대기명단에 등록되었습니다.')
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
    <div className="w-full px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-brand-tint">
          <CalendarDays className="h-[19px] w-[19px] text-brand-deep" strokeWidth={1.75} />
        </span>
        <h1 className="text-heading-lg text-ink">일정</h1>
      </div>

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

      {message && (
        <p
          role="status"
          className={`mb-6 rounded-card px-4 py-3 text-body-strong ${
            messageTone === 'error' ? 'bg-danger-tint text-danger' : 'bg-success-tint text-success'
          }`}
        >
          {message}
        </p>
      )}

      {visible === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton variant="block" className="h-16" />
          <Skeleton variant="block" className="h-16" />
          <Skeleton variant="block" className="h-16" />
        </div>
      ) : sessions !== null && sessions.length === 0 ? (
        <EmptyState title="예정된 수업이 없습니다" description="새로운 시간표가 등록되면 여기에 표시됩니다." />
      ) : visible.length === 0 ? (
        <EmptyState title="이 기간에는 수업이 없습니다" description="기간을 넓히거나 다른 기간을 확인해보세요." />
      ) : (
        // One card per session, split by what a member decides with: the top
        // row is identity (name of the class, and my status if I have one),
        // the middle is logistics in reading order (when, who, how full), and
        // the action sits on its own row at full tap width. The previous
        // single line buried "언제" inside a dot-separated sentence and left
        // the button competing with text for the same row.
        <ul className="flex flex-col gap-3">
          {visible.map((s) => (
            <li key={s.id}>
              <Card className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-heading-md text-ink">{s.title}</span>
                  {s.myStatus === 'booked' && <StatusBadge tone="success">예약완료</StatusBadge>}
                  {s.myStatus === 'waitlisted' && <StatusBadge tone="waitlisted">대기중</StatusBadge>}
                  {!s.myStatus && s.isFull && <StatusBadge tone="danger">마감</StatusBadge>}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted">
                  <span className="text-body-strong text-ink">
                    {s.date} {s.startTime}
                  </span>
                  <span>{s.instructorName}</span>
                  <span>
                    {s.bookedCount}/{s.capacity}명
                  </span>
                </div>

                {!s.myStatus && (
                  <Button
                    variant={s.isFull ? 'secondary' : 'primary'}
                    className="mt-1 w-full"
                    onClick={() => handleBook(s.id)}
                  >
                    {s.isFull ? '대기 등록' : '예약하기'}
                  </Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
