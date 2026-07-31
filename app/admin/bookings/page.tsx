'use client'

import { useState, useEffect } from 'react'
import { listSessionsWithRoster } from '@/lib/actions/dashboard'

export default function BookingsDashboardPage() {
  // `any[]`가 아니라 listSessionsWithRoster()의 실제 반환 타입을 그대로 쓴다 --
  // app/instructor/page.tsx가 listMySessionsWithBookings()에 쓰는 것과 동일한 관용구
  // (`Awaited<ReturnType<typeof ...>>`)로, 새 타입을 export하지 않고도 any를 피한다.
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof listSessionsWithRoster>>>([])

  useEffect(() => {
    listSessionsWithRoster().then(setSessions)
  }, [])

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-medium text-black">예약 현황</h1>

      {sessions.map((s) => (
        <section key={s.id} className="mb-10">
          <h2 className="mb-2 text-xl font-medium text-black">
            {s.date} · {s.title} · {s.instructorName} · {s.booked.length}/{s.capacity}
          </h2>
          <p className="text-sm text-black">예약: {s.booked.map((b) => b.member?.full_name).join(', ') || '없음'}</p>
          <p className="text-sm text-zinc-500">
            대기: {s.waitlisted.map((b) => b.member?.full_name).join(', ') || '없음'}
          </p>
        </section>
      ))}
    </div>
  )
}
