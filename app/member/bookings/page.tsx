'use client'

import { useState, useEffect, useCallback } from 'react'
import { listMyBookings, cancelBooking } from '@/lib/actions/bookings'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { X } from 'lucide-react'

export default function MyBookingsPage() {
  // `any[]`가 아니라 listMyBookings()의 실제 반환 타입을 그대로 사용한다 -- 이미
  // app/member/page.tsx가 같은 방식(`Awaited<ReturnType<typeof ...>>`)을 쓰고 있어
  // 새 타입을 export하지 않고도 동일한 관용구로 any를 피할 수 있다.
  const [bookings, setBookings] = useState<Awaited<ReturnType<typeof listMyBookings>> | null>(null)
  // app/member/page.tsx의 handleBook과 동일한 관용구 -- cancelBooking()의 결과를
  // 그냥 버리지 않고 성공/실패 모두 사용자에게 보여준다. 최종 리뷰 이전에는
  // cancel_booking이 실패해도(데드락으로 abort된 경우 등) 아무 피드백 없이 조용히
  // 아무 일도 일어나지 않은 것처럼 보였다.
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success')

  const refresh = useCallback(() => {
    listMyBookings().then(setBookings)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleCancel(bookingId: string) {
    setMessage(null)
    const result = await cancelBooking(bookingId)
    if ('error' in result) {
      setMessageTone('error')
      setMessage(result.error)
      return
    }
    setMessageTone('success')
    setMessage('예약이 취소되었습니다.')
    refresh()
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="mb-8 text-heading-lg text-ink">내 예약</h1>

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

      {bookings === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton variant="block" className="h-16" />
          <Skeleton variant="block" className="h-16" />
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState title="예약 내역이 없습니다" description="시간표에서 수업을 예약하면 여기에 표시됩니다." />
      ) : (
        <ul className="flex flex-col">
          {bookings.map((b) => (
            <li
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline py-4 text-body-md text-ink first:border-t-0"
            >
              <span className="inline-flex flex-wrap items-center gap-2">
                {b.session?.date} · {b.session?.template?.title}
                <StatusBadge tone={b.status === 'booked' ? 'success' : 'waitlisted'}>
                  {b.status === 'booked' ? '예약완료' : '대기중'}
                </StatusBadge>
              </span>
              <Button variant="secondary" icon={X} onClick={() => handleCancel(b.id)}>
                취소
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
