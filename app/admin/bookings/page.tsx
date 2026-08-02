'use client'

import { useState, useEffect } from 'react'
import { listSessionsWithRoster } from '@/lib/actions/dashboard'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

export default function BookingsDashboardPage() {
  // `any[]`가 아니라 listSessionsWithRoster()의 실제 반환 타입을 그대로 쓴다 --
  // app/instructor/page.tsx가 listMySessionsWithBookings()에 쓰는 것과 동일한 관용구
  // (`Awaited<ReturnType<typeof ...>>`)로, 새 타입을 export하지 않고도 any를 피한다.
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof listSessionsWithRoster>> | null>(null)

  useEffect(() => {
    listSessionsWithRoster().then(setSessions)
  }, [])

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="mb-8 text-heading-lg text-ink">예약 현황</h1>

      {sessions === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton variant="block" className="h-24" />
          <Skeleton variant="block" className="h-24" />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState title="다가오는 세션이 없습니다" description="시간표관리에서 반복 시간표를 등록해보세요." />
      ) : (
        sessions.map((s) => (
          <section key={s.id} className="mb-10">
            <h2 className="mb-2 text-heading-md text-ink">
              {s.date} · {s.title} · {s.instructorName} · {s.booked.length}/{s.capacity}
            </h2>
            <p className="text-body-md text-ink">예약: {s.booked.map((b) => b.member?.full_name).join(', ') || '없음'}</p>
            <p className="text-body-md text-muted">
              대기: {s.waitlisted.map((b) => b.member?.full_name).join(', ') || '없음'}
            </p>
          </section>
        ))
      )}
    </div>
  )
}
