'use client'

import { useState, useEffect, useCallback } from 'react'
import { listUpcomingSessionsWithBookingState, bookSession } from '@/lib/actions/bookings'

export default function MemberSchedulePage() {
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof listUpcomingSessionsWithBookingState>>>([])
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
      <h1 className="mb-8 text-3xl font-medium text-black">시간표</h1>

      {message && (
        <p
          role="status"
          className={`mb-6 rounded-2xl px-4 py-3 text-sm font-medium ${
            messageTone === 'error' ? 'bg-zinc-100 text-[#d30005]' : 'bg-zinc-100 text-[#007d48]'
          }`}
        >
          {message}
        </p>
      )}

      <ul className="flex flex-col">
        {sessions.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 py-4 first:border-t-0"
          >
            <div className="text-sm text-black">
              <span className="font-medium">
                {s.date} · {s.title}
              </span>
              <span className="text-zinc-500">
                {' '}
                · {s.instructorName} · {s.bookedCount}/{s.capacity}
              </span>
              {s.isFull && !s.myStatus && <span className="ml-2 text-xs font-medium text-[#d30005]">마감</span>}
            </div>

            {s.myStatus === 'booked' && <span className="text-sm font-medium text-[#007d48]">예약완료</span>}
            {s.myStatus === 'waitlisted' && <span className="text-sm font-medium text-zinc-500">대기중</span>}
            {!s.myStatus && (
              <button
                onClick={() => handleBook(s.id)}
                className="rounded-full bg-black px-6 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                {s.isFull ? '대기 등록' : '예약하기'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
