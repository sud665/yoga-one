'use client'

import { useEffect, useState } from 'react'
import { Search, UserPlus, X } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/TextInput'
import { listProfilesByRole } from '@/lib/actions/roster'
import { adminAddParticipant } from '@/lib/actions/bookings'
import type { Profile } from '@/lib/types'

export interface AddParticipantSheetProps {
  sessionId: string
  sessionLabel: string
  /** member_ids already booked/waitlisted on this session -- shown as "추가됨" instead of an add button. */
  existingMemberIds: string[]
  onClose: () => void
  /** Called after a successful add so the caller can refetch its session list -- the sheet stays open (matching the design) so staff can add several people in one pass. */
  onAdded: () => void
}

// Shared between /admin/bookings (원장 예약현황) and /instructor (강사 내
//수업) -- both screens let staff add someone to a session's roster
// directly via admin_add_participant, either an existing registered member
// or a one-day walk-in guest with no profile at all.
export function AddParticipantSheet({
  sessionId,
  sessionLabel,
  existingMemberIds,
  onClose,
  onAdded,
}: AddParticipantSheetProps) {
  const [members, setMembers] = useState<Profile[] | null>(null)
  const [query, setQuery] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [pendingGuest, setPendingGuest] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listProfilesByRole('member').then(setMembers)
  }, [])

  const filtered = (members ?? []).filter((m) => !query.trim() || m.full_name.includes(query.trim()))

  async function handleAddMember(memberId: string) {
    setError(null)
    setPendingId(memberId)
    const result = await adminAddParticipant(sessionId, { memberId })
    setPendingId(null)
    if ('error' in result) {
      setError(result.error)
      return
    }
    onAdded()
  }

  async function handleAddGuest() {
    const name = guestName.trim()
    if (!name) {
      setError('이름을 입력해주세요.')
      return
    }
    setError(null)
    setPendingGuest(true)
    const result = await adminAddParticipant(sessionId, { guestName: name, guestPhone: guestPhone.trim() || undefined })
    setPendingGuest(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setGuestName('')
    setGuestPhone('')
    onAdded()
  }

  return (
    // absolute, not fixed: covers the app-shell frame (position: relative),
    // not the true browser viewport -- same reasoning as admin-nav.tsx's
    // NavSheet.
    <div className="absolute inset-0 z-[70] flex flex-col justify-end">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-ink/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="참가자 추가"
        className="relative flex max-h-[78%] flex-col gap-4 rounded-t-card border-t border-hairline bg-canvas p-4 motion-safe:animate-[roster-sheet-in_180ms_ease-out]"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-heading-md text-ink">참가자 추가</p>
            <p className="mt-0.5 text-caption text-muted">{sessionLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-full p-1 text-muted hover:bg-surface-soft hover:text-ink"
          >
            <X aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <div className="flex items-center gap-2 rounded-input border border-hairline bg-canvas px-3.5">
            <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="회원 이름 검색"
              className="h-11 w-full border-0 bg-transparent text-body-md text-ink outline-none placeholder:text-muted"
            />
          </div>

          {error && (
            <p role="alert" className="text-body-md text-danger">
              {error}
            </p>
          )}

          <div>
            <p className="mb-1 text-label text-muted">등록 회원</p>
            {members === null ? (
              <p className="py-3 text-body-md text-muted">불러오는 중...</p>
            ) : filtered.length === 0 ? (
              <p className="py-3 text-body-md text-muted">
                검색 결과가 없습니다. 아래에서 원데이 참가자로 추가할 수 있습니다.
              </p>
            ) : (
              <ul className="flex flex-col">
                {filtered.map((member) => {
                  const added = existingMemberIds.includes(member.id)
                  return (
                    <li
                      key={member.id}
                      className="flex items-center justify-between gap-3 border-t border-hairline-soft py-2.5 first:border-t-0"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-tint text-caption text-brand-deep">
                          {member.full_name.slice(0, 1)}
                        </span>
                        <span>
                          <span className="block text-body-strong text-ink">{member.full_name}</span>
                          <span className="block text-caption text-muted">{member.phone ?? '연락처 미등록'}</span>
                        </span>
                      </span>
                      {added ? (
                        <span className="shrink-0 rounded-full bg-success-tint px-2.5 py-1 text-caption text-success">
                          추가됨
                        </span>
                      ) : (
                        <Button
                          variant="secondary"
                          icon={UserPlus}
                          disabled={pendingId === member.id}
                          onClick={() => handleAddMember(member.id)}
                        >
                          추가
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="rounded-card bg-surface-soft p-3.5">
            <p className="text-body-strong text-ink">원데이 참가자</p>
            <p className="mt-1 mb-3 text-caption text-muted">등록 회원이 아닌 참가자를 이름으로 바로 추가합니다.</p>
            <div className="flex flex-col gap-2.5">
              <TextInput value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="이름" />
              <TextInput
                value={guestPhone}
                onChange={(event) => setGuestPhone(event.target.value)}
                inputMode="tel"
                placeholder="전화번호 (선택)"
              />
              <Button onClick={handleAddGuest} disabled={pendingGuest} className="w-full">
                원데이 참가자 추가
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
