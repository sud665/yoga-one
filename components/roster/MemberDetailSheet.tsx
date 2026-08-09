'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { getMemberDetail, extendMembership, toggleMembershipPause, type MemberDetail } from '@/lib/actions/roster'

export interface MemberDetailSheetProps {
  memberId: string
  onClose: () => void
  /** Called after extend/pause succeeds so the caller can refetch its list (status/expiry changed). */
  onChanged: () => void
}

const STATUS_LABEL = { active: '유효', soon: '만료 임박', expired: '만료', unregistered: '정보 없음' } as const
const STATUS_TONE = { active: 'success', soon: 'warning', expired: 'danger', unregistered: 'neutral' } as const

export function MemberDetailSheet({ memberId, onClose, onChanged }: MemberDetailSheetProps) {
  const [detail, setDetail] = useState<MemberDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 확인 다이얼로그가 겨누고 있는 액션. 원래 window.confirm이었다(QA
  // 전수검사 2026-08-08, 항목 3 -- 당시엔 전용 확인 컴포넌트가 없어 가장
  // 가벼운 수단이었음). ConfirmDialog가 생기면서 앱 전체 확인 UI와 통일.
  const [confirmAction, setConfirmAction] = useState<'extend' | 'pause' | 'resume' | null>(null)
  const { toast } = useToast()

  // No memberId-changed reset needed: the parent (app/admin/roster/members/
  // page.tsx) only ever renders this component while `selectedId` is
  // truthy, so a new memberId always means a fresh mount (detail already
  // starts at null via useState above), never a prop change on an existing
  // instance.
  useEffect(() => {
    getMemberDetail(memberId).then(setDetail)
  }, [memberId])

  async function refetch() {
    setDetail(await getMemberDetail(memberId))
    onChanged()
  }

  async function performExtend() {
    if (!detail?.registrationId) return
    setError(null)
    setBusy(true)
    const result = await extendMembership(detail.registrationId)
    setBusy(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    toast({ title: '회원권을 연장했습니다', tone: 'success' })
    await refetch()
  }

  async function performTogglePause(pausing: boolean) {
    if (!detail?.registrationId) return
    setError(null)
    setBusy(true)
    const result = await toggleMembershipPause(detail.registrationId, pausing)
    setBusy(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    toast({ title: pausing ? '회원권을 일시정지했습니다' : '회원권을 재개했습니다', tone: 'success' })
    await refetch()
  }

  const CONFIRM_COPY = {
    extend: { title: '회원권을 1개월 연장할까요?', confirmLabel: '연장' },
    pause: { title: '회원권을 일시정지할까요?', confirmLabel: '일시정지' },
    resume: { title: '회원권을 재개할까요?', confirmLabel: '재개' },
  } as const

  return (
    <div className="absolute inset-0 z-[76] flex flex-col justify-end">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-ink/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="회원 상세"
        className="relative flex max-h-[82%] flex-col gap-4 rounded-t-card border-t border-hairline bg-canvas p-4 motion-safe:animate-[roster-sheet-in_180ms_ease-out]"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        {detail === null ? (
          <div className="flex flex-col gap-3">
            <Skeleton variant="block" className="h-14" />
            <Skeleton variant="block" className="h-32" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-tint text-body-strong text-brand-deep">
                {detail.fullName.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-heading-md text-ink">
                  {detail.fullName}
                  <StatusBadge tone={STATUS_TONE[detail.status]}>{STATUS_LABEL[detail.status]}</StatusBadge>
                  {detail.paused && <StatusBadge tone="neutral">일시정지</StatusBadge>}
                </p>
                <p className="mt-0.5 truncate text-caption text-muted">
                  {detail.phone ?? '연락처 미등록'}
                  {detail.email ? ` · ${detail.email}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className="shrink-0 rounded-full p-1 text-muted hover:bg-surface-soft hover:text-ink"
              >
                <X aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
              {detail.status === 'unregistered' ? (
                <div className="rounded-card border border-hairline bg-surface p-3.5 text-body-md text-muted">
                  등록된 회원권 정보가 없습니다. 초대 링크로 가입한 회원이라 회원 등록 마법사를 거치지 않았습니다.
                </div>
              ) : (
                <>
                  <div className="rounded-card border border-hairline bg-surface p-3.5">
                    <p className="mb-2 text-body-strong text-ink">회원권</p>
                    <DetailRow label="이용권" value={`${detail.planLabel} · ${detail.termMonths}개월`} />
                    <DetailRow label="개시일" value={detail.startDate ?? '—'} />
                    <DetailRow label="만료일" value={detail.expiryDate ?? '—'} />
                    <DetailRow
                      label="남은 기간"
                      value={detail.daysLeft !== null ? (detail.daysLeft < 0 ? `만료 ${Math.abs(detail.daysLeft)}일 경과` : `${detail.daysLeft}일`) : '—'}
                    />
                    <DetailRow label="수강 클래스" value={detail.classes.length ? detail.classes.join(', ') : '전체 클래스'} />
                  </div>

                  <div className="rounded-card border border-hairline bg-surface p-3.5">
                    <p className="mb-1 text-body-strong text-ink">동의 내역</p>
                    <DetailRow label="마케팅 정보 수신" value={detail.marketingConsent ? '동의' : '미동의'} />
                    <DetailRow label="SNS 사진 게시" value={detail.photoConsent ? '동의' : '미동의'} />
                  </div>
                </>
              )}

              <div className="rounded-card border border-hairline bg-surface p-3.5">
                <p className="mb-1 text-body-strong text-ink">최근 출석</p>
                {detail.recentAttendance.length === 0 ? (
                  <p className="pt-2 text-caption text-muted">출석 기록이 아직 없습니다</p>
                ) : (
                  detail.recentAttendance.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 border-t border-hairline-soft pt-2.5 first:border-t-0 first:pt-0"
                    >
                      <span className="text-caption text-body">
                        {h.date} {h.title}
                      </span>
                      <StatusBadge tone={h.status === 'attended' ? 'success' : 'danger'}>
                        {h.status === 'attended' ? '출석' : '결석'}
                      </StatusBadge>
                    </div>
                  ))
                )}
              </div>

              {error && (
                <p role="alert" className="text-body-md text-danger">
                  {error}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => setConfirmAction('extend')} disabled={busy || !detail.registrationId}>
                  회원권 연장
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setConfirmAction(detail.paused ? 'resume' : 'pause')}
                  disabled={busy || !detail.registrationId}
                >
                  {detail.paused ? '재개' : '일시정지'}
                </Button>
                {/* 원장<->회원 1:1 DM은 지원하지 않는다 (get_or_create_dm의
                    의도적 제약 -- 직원이 포함된 그룹방에서만 대화). 그래서
                    특정 회원을 목표로 하는 대신 채팅 목록으로 보낸다. */}
                <Link
                  href="/admin/chat"
                  className="col-span-2 flex h-11 items-center justify-center rounded-button border border-hairline text-button text-ink hover:bg-surface-soft"
                >
                  메시지 보내기
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 시트(z-[76]) 위에 서는 확인 다이얼로그(z-[80]). 시트 루트가
          inset-0이라 다이얼로그의 absolute inset-0도 같은 프레임 전체를
          덮는다. */}
      {detail && confirmAction && (
        <ConfirmDialog
          open
          title={CONFIRM_COPY[confirmAction].title}
          description={`${detail.fullName}님의 회원권에 바로 적용됩니다.`}
          confirmLabel={CONFIRM_COPY[confirmAction].confirmLabel}
          onConfirm={() => {
            const action = confirmAction
            setConfirmAction(null)
            if (action === 'extend') performExtend()
            else performTogglePause(action === 'pause')
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-hairline-soft pt-2 first:border-t-0 first:pt-0">
      <span className="shrink-0 text-caption text-muted">{label}</span>
      <span className="text-right text-body-strong text-ink">{value}</span>
    </div>
  )
}
