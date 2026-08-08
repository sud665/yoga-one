import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { getMyMembership } from '@/lib/actions/roster'

const STATUS_LABEL = { active: '유효', soon: '만료 임박', expired: '만료', unregistered: '정보 없음' } as const
const STATUS_TONE = { active: 'success', soon: 'warning', expired: 'danger', unregistered: 'neutral' } as const

// Server component, not client: a read-only summary of data that only
// changes from the owner's side (연장/일시정지), so there's nothing here to
// refetch after a local action the way MemberDetailSheet.tsx (the owner's
// equivalent view) needs to. Same STATUS_LABEL/STATUS_TONE and DetailRow
// shape as that component -- not extracted into a shared file for two
// three-line consts and one four-line row helper.
export async function MyMembershipCard() {
  const detail = await getMyMembership()
  if (!detail || detail.status === 'unregistered') return null

  return (
    <Card className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-heading-md text-ink">내 회원권</p>
        <div className="flex items-center gap-1.5">
          <StatusBadge tone={STATUS_TONE[detail.status]}>{STATUS_LABEL[detail.status]}</StatusBadge>
          {detail.paused && <StatusBadge tone="neutral">일시정지</StatusBadge>}
        </div>
      </div>
      <DetailRow label="이용권" value={`${detail.planLabel} · ${detail.termMonths}개월`} />
      <DetailRow label="개시일" value={detail.startDate ?? '—'} />
      <DetailRow label="만료일" value={detail.expiryDate ?? '—'} />
      <DetailRow
        label="남은 기간"
        value={detail.daysLeft !== null ? (detail.daysLeft < 0 ? `만료 ${Math.abs(detail.daysLeft)}일 경과` : `${detail.daysLeft}일`) : '—'}
      />
      <DetailRow label="수강 클래스" value={detail.classes.length ? detail.classes.join(', ') : '전체 클래스'} />
    </Card>
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
