'use client'

import { useState, useEffect, useCallback } from 'react'
import { listMyBookings, cancelBooking } from '@/lib/actions/bookings'

export default function MyBookingsPage() {
  // `any[]`가 아니라 listMyBookings()의 실제 반환 타입을 그대로 사용한다 -- 이미
  // app/member/page.tsx가 같은 방식(`Awaited<ReturnType<typeof ...>>`)을 쓰고 있어
  // 새 타입을 export하지 않고도 동일한 관용구로 any를 피할 수 있다.
  const [bookings, setBookings] = useState<Awaited<ReturnType<typeof listMyBookings>>>([])

  const refresh = useCallback(() => {
    listMyBookings().then(setBookings)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleCancel(bookingId: string) {
    await cancelBooking(bookingId)
    refresh()
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-medium text-black">내 예약</h1>

      <ul className="flex flex-col">
        {bookings.map((b) => (
          <li
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 py-4 text-sm text-black first:border-t-0"
          >
            <span>
              {b.session?.date} · {b.session?.template?.title}
              <span className={`ml-2 font-medium ${b.status === 'booked' ? 'text-[#007d48]' : 'text-zinc-500'}`}>
                {b.status === 'booked' ? '예약완료' : '대기중'}
              </span>
            </span>
            <button
              onClick={() => handleCancel(b.id)}
              className="rounded-full bg-zinc-100 px-6 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              취소
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
