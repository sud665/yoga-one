'use client'

import { useState, useEffect, useCallback } from 'react'
import { listMySessionsWithBookings, markAttendance } from '@/lib/actions/attendance'

export default function InstructorHomePage() {
  // `any[]`가 아니라 listMySessionsWithBookings()의 실제 반환 타입을 그대로 쓴다 --
  // app/member/bookings/page.tsx가 listMyBookings()에 쓰는 것과 동일한 관용구
  // (`Awaited<ReturnType<typeof ...>>`)로, 새 타입을 export하지 않고도 any를 피한다.
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof listMySessionsWithBookings>>>([])

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
      <h1 className="mb-8 text-3xl font-medium text-black">내 수업</h1>

      {sessions.map((s) => (
        <section key={s.id} className="mb-10">
          <h2 className="mb-2 text-xl font-medium text-black">
            {s.date} · {s.template?.title}
          </h2>
          <ul className="flex flex-col">
            {s.bookings
              .filter((b) => b.status === 'booked' || b.status === 'attended' || b.status === 'no_show')
              .map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 py-4 first:border-t-0"
                >
                  <span
                    className={`text-sm ${
                      b.status === 'attended'
                        ? 'font-medium text-[#007d48]'
                        : b.status === 'no_show'
                          ? 'font-medium text-zinc-500'
                          : 'text-black'
                    }`}
                  >
                    {b.member?.full_name} · {b.status}
                  </span>
                  {b.status === 'booked' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMark(b.id, 'attended')}
                        className="rounded-full bg-black px-6 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
                      >
                        출석
                      </button>
                      <button
                        onClick={() => handleMark(b.id, 'no_show')}
                        className="rounded-full bg-zinc-100 px-6 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
                      >
                        결석
                      </button>
                    </div>
                  )}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
