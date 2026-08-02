'use client'

import { useState, useEffect, useCallback } from 'react'
import { listMySessionsWithBookings, markAttendance } from '@/lib/actions/attendance'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Check, X } from 'lucide-react'

// b.status ('booked'/'attended'/'no_show') is rendered verbatim as the raw
// enum value -- existing behavior, unchanged by this retoken pass (several
// Playwright specs assert on e.g. getByText('출석 회원 · booked') literally).
// One bundled typography class per branch (never two layered on the same
// element -- text-body-strong/text-body-md each already bundle size + line
// height + weight, so stacking both on one element would leave the cascade
// order between them undefined).
const STATUS_TEXT_CLASSES: Record<string, string> = {
  attended: 'text-body-strong text-success',
  no_show: 'text-body-strong text-muted',
}

export default function InstructorHomePage() {
  // `any[]`가 아니라 listMySessionsWithBookings()의 실제 반환 타입을 그대로 쓴다 --
  // app/member/bookings/page.tsx가 listMyBookings()에 쓰는 것과 동일한 관용구
  // (`Awaited<ReturnType<typeof ...>>`)로, 새 타입을 export하지 않고도 any를 피한다.
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof listMySessionsWithBookings>> | null>(null)

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

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="mb-8 text-heading-lg text-ink">내 수업</h1>

      {sessions === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton variant="block" className="h-32" />
          <Skeleton variant="block" className="h-32" />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState title="예정된 수업이 없습니다" description="담당 수업이 배정되면 여기에 표시됩니다." />
      ) : (
        sessions.map((s) => (
          <section key={s.id} className="mb-10">
            <h2 className="mb-2 text-heading-md text-ink">
              {s.date} · {s.template?.title}
            </h2>
            <ul className="flex flex-col">
              {s.bookings
                .filter((b) => b.status === 'booked' || b.status === 'attended' || b.status === 'no_show')
                .map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline py-4 first:border-t-0"
                  >
                    <span className={STATUS_TEXT_CLASSES[b.status] ?? 'text-body-md text-ink'}>
                      {b.member?.full_name} · {b.status}
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
          </section>
        ))
      )}
    </div>
  )
}
