'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, UserPlus } from 'lucide-react'
import { listSessionsWithRoster } from '@/lib/actions/dashboard'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PeriodFilter } from '@/components/ui/PeriodFilter'
import { usePeriodFilter } from '@/lib/use-period-filter'
import { AddParticipantSheet } from '@/components/bookings/AddParticipantSheet'

export default function BookingsDashboardPage() {
  // `any[]`가 아니라 listSessionsWithRoster()의 실제 반환 타입을 그대로 쓴다 --
  // app/instructor/page.tsx가 listMySessionsWithBookings()에 쓰는 것과 동일한 관용구
  // (`Awaited<ReturnType<typeof ...>>`)로, 새 타입을 export하지 않고도 any를 피한다.
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof listSessionsWithRoster>> | null>(null)
  const [addSessionId, setAddSessionId] = useState<string | null>(null)
  // 목록보다 캘린더가 먼저 보이는 쪽이 자연스럽다(토글로 전환 가능한 건
  // 그대로) -- 다만 캘린더가 뜬다고 목록까지 자동으로 오늘 하루로
  // 좁아지진 않는다. granularity는 여전히 '전체'로 시작해서(두 번째
  // 인자가 view만 바꾼다) 방금 등록한 예약이 오늘이 아니라는 이유로
  // 화면에서 사라지는 일이 없다 -- 날짜를 실제로 클릭해야 그 날로 좁혀진다.
  const period = usePeriodFilter('all', 'calendar')

  const refresh = useCallback(() => {
    listSessionsWithRoster().then(setSessions)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const visible = sessions === null ? null : period.filter(sessions, (s) => s.date)
  // Dots go on every day that has something, not just the days that
  // survive the current filter -- otherwise selecting a day would erase
  // the marks that show where the other days are.
  const datesWithItems = useMemo(
    () => Array.from(new Set((sessions ?? []).map((s) => s.date).filter((d): d is string => Boolean(d)))),
    [sessions]
  )

  const addTarget = (sessions ?? []).find((s) => s.id === addSessionId)

  return (
    <div className="w-full px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-brand-tint">
          <ClipboardList className="h-[19px] w-[19px] text-brand-deep" strokeWidth={1.75} />
        </span>
        <h1 className="text-heading-lg text-ink">예약 현황</h1>
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

      {visible === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton variant="block" className="h-24" />
          <Skeleton variant="block" className="h-24" />
        </div>
      ) : sessions !== null && sessions.length === 0 ? (
        <EmptyState title="다가오는 세션이 없습니다" description="시간표관리에서 반복 시간표를 등록해보세요." />
      ) : visible.length === 0 ? (
        // Distinct from the no-sessions-at-all case above: the studio has
        // sessions, this period just isn't where they are, so the way out is
        // widening the filter rather than creating a schedule.
        <EmptyState title="이 기간에는 세션이 없습니다" description="기간을 넓히거나 다른 기간을 확인해보세요." />
      ) : (
        // One card per session, structured by what an owner actually scans
        // for: the title line answers "which class", the capacity badge
        // answers "is it filling" without reading a number sentence, and the
        // rosters render as name chips -- countable at a glance, where a
        // comma-joined sentence made four names and one name look alike.
        <div className="flex flex-col gap-4">
          {visible.map((s) => {
            const isFull = s.booked.length >= s.capacity
            return (
              <Card key={s.id} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-heading-md text-ink">{s.title}</h2>
                  <StatusBadge tone={isFull ? 'danger' : 'success'}>
                    {s.booked.length}/{s.capacity}
                  </StatusBadge>
                </div>
                <p className="text-caption text-muted">
                  {s.date}
                  {s.startTime ? ` ${s.startTime}` : ''} · {s.instructorName}
                </p>

                <div className="flex flex-col gap-2 border-t border-hairline-soft pt-3">
                  <RosterRow label="예약" bookings={s.booked} />
                  {/* The waitlist row only exists when someone is on it: an
                      always-present "대기: 없음" is noise on every card to
                      cover the rare card where it isn't. */}
                  {s.waitlisted.length > 0 && <RosterRow label="대기" bookings={s.waitlisted} waitlisted />}
                </div>

                <Button variant="secondary" icon={UserPlus} onClick={() => setAddSessionId(s.id)} className="w-full">
                  회원 · 원데이 추가
                </Button>
              </Card>
            )
          })}
        </div>
      )}

      {addTarget && (
        <AddParticipantSheet
          sessionId={addTarget.id}
          sessionLabel={`${addTarget.title} · ${addTarget.date}${addTarget.startTime ? ` ${addTarget.startTime}` : ''}`}
          existingMemberIds={[...addTarget.booked, ...addTarget.waitlisted]
            .map((b) => b.member_id)
            .filter((id): id is string => Boolean(id))}
          onClose={() => setAddSessionId(null)}
          onAdded={refresh}
        />
      )}
    </div>
  )
}

type RosterBooking = { member?: { full_name: string | null } | null; guest_name?: string | null }

// Label + name chips. Chips over a comma-joined sentence because a roster is
// a set you count and scan for a name, not prose you read -- and an empty
// set says so explicitly instead of rendering an empty sentence. Falls back
// to guest_name for a walk-in booking (member is null for those, by the
// bookings_member_xor_guest constraint), with a "원데이" chip suffix so a
// staff member scanning the roster can tell a walk-in from a registered
// member at a glance.
function RosterRow({ label, bookings, waitlisted = false }: { label: string; bookings: RosterBooking[]; waitlisted?: boolean }) {
  return (
    // data-roster: a structural hook for the e2e specs. They used to read the
    // whole roster as one sentence; with chips, "find the booked row that
    // contains this name" needs an anchor that isn't display text.
    <div data-roster={waitlisted ? 'waitlisted' : 'booked'} className="flex flex-wrap items-center gap-1.5">
      <span className="text-caption text-muted">{label}</span>
      {bookings.length === 0 ? (
        <span className="text-caption text-muted">없음</span>
      ) : (
        bookings.map((b, i) => (
          <span
            key={i}
            className={`rounded-full px-2.5 py-0.5 text-caption ${
              waitlisted ? 'bg-warning-tint text-warning' : 'bg-brand-tint text-brand-deep'
            }`}
          >
            {b.member?.full_name ?? b.guest_name ?? '?'}
            {b.guest_name && ' · 원데이'}
          </span>
        ))
      )}
    </div>
  )
}
