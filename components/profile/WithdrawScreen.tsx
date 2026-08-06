'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trash2, AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/TextInput'
import { withdrawAccount } from '@/lib/actions/profile'

// What withdraw_my_account (20260805000001) actually does, in plain
// language -- it anonymizes rather than deletes (bookings/class_templates/
// class_sessions all FK to profiles(id) with no cascade), so this list has
// to stay accurate to that, not just to the design mockup's placeholder copy.
const WITHDRAW_NOTES = [
  '예약 및 출석 이력은 스튜디오 기록으로 남습니다.',
  '이름과 전화번호는 삭제됩니다.',
  '이 계정으로는 다시 로그인할 수 없습니다.',
  '같은 이메일로 다시 초대받으면 새 계정으로 가입할 수 있습니다.',
]

const REASON_OPTIONS = ['이사 · 거리', '수업 시간이 맞지 않음', '수강료 부담', '기타']

export function WithdrawScreen({ role }: { role: 'member' | 'instructor' }) {
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const title = role === 'instructor' ? '강사 탈퇴' : '회원 탈퇴'

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = await withdrawAccount(new FormData(event.currentTarget))
    setSubmitting(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="w-full px-6 py-12">
        <Card variant="soft" className="text-center">
          <p className="text-heading-md text-ink">탈퇴가 완료되었습니다</p>
          <p className="mt-2 mb-5 text-body-md text-body">
            그동안 이용해주셔서 감사합니다.
            <br />
            같은 이메일로 다시 초대받으면 언제든 돌아올 수 있습니다.
          </p>
          <Button href="/login" variant="secondary" className="w-full">
            로그인 화면으로
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full px-6 py-12">
      <p className="mb-1 text-caption text-muted">프로필 · 계정</p>
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-danger-tint">
          <Trash2 className="h-[19px] w-[19px] text-danger" strokeWidth={1.75} />
        </span>
        <h1 className="text-heading-lg text-ink">{title}</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-start gap-2.5 rounded-card bg-danger-tint px-4 py-3.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" strokeWidth={2} />
          <p className="text-body-strong text-danger">탈퇴하면 되돌릴 수 없습니다.</p>
        </div>

        <Card>
          <p className="mb-3 text-heading-md text-ink">탈퇴 시 처리되는 내용</p>
          <ul className="flex flex-col gap-3">
            {WITHDRAW_NOTES.map((note) => (
              <li key={note} className="flex gap-2 border-t border-hairline-soft pt-3 text-body-md text-body">
                <span aria-hidden="true" className="text-muted">
                  ·
                </span>
                {note}
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="withdraw-reason" className="text-label text-muted">
            탈퇴 사유 (선택)
          </label>
          <Select id="withdraw-reason" name="reason" defaultValue="">
            <option value="">선택하지 않음</option>
            {REASON_OPTIONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </Select>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 rounded-input border border-hairline bg-canvas p-3.5">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="h-4 w-4 accent-brand-deep"
          />
          <span className="text-body-strong text-ink">위 내용을 확인했으며 탈퇴에 동의합니다</span>
        </label>

        {error && (
          <p role="alert" className="text-body-md text-danger">
            {error}
          </p>
        )}

        <Button type="submit" variant="danger" icon={Trash2} disabled={!agreed || submitting} className="w-full">
          {submitting ? '처리 중...' : title}
        </Button>

        <Link href={`/${role}/profile`} className="mx-auto text-body-md text-muted underline">
          돌아가기
        </Link>
      </form>
    </div>
  )
}
