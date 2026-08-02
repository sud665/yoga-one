'use client'

import { useState, useEffect, useCallback } from 'react'
import { listUpcomingSessionsWithBookingState, bookSession } from '@/lib/actions/bookings'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

export default function MemberSchedulePage() {
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof listUpcomingSessionsWithBookingState>> | null>(
    null
  )
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success')

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

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="mb-8 text-heading-lg text-ink">시간표</h1>

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

      {sessions === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton variant="block" className="h-16" />
          <Skeleton variant="block" className="h-16" />
          <Skeleton variant="block" className="h-16" />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState title="예정된 수업이 없습니다" description="새로운 시간표가 등록되면 여기에 표시됩니다." />
      ) : (
        <ul className="flex flex-col">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline py-4 first:border-t-0"
            >
              <div className="text-body-md text-ink">
                <span className="text-body-strong">
                  {s.date} · {s.title}
                </span>
                <span className="text-muted">
                  {' '}
                  · {s.instructorName} · {s.bookedCount}/{s.capacity}
                </span>
                {s.isFull && !s.myStatus && (
                  <StatusBadge tone="danger" className="ml-2">
                    마감
                  </StatusBadge>
                )}
              </div>

              {s.myStatus === 'booked' && <StatusBadge tone="success">예약완료</StatusBadge>}
              {s.myStatus === 'waitlisted' && <StatusBadge tone="waitlisted">대기중</StatusBadge>}
              {!s.myStatus && <Button onClick={() => handleBook(s.id)}>{s.isFull ? '대기 등록' : '예약하기'}</Button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
