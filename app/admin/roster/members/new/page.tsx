'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronRight, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TextInput } from '@/components/ui/TextInput'
import { registerMember } from '@/lib/actions/member-registration'
import { listTemplatesWithUpcomingSessions } from '@/lib/actions/schedule'
import { AGREEMENTS, PLANS, TERMS, computeMembershipPrice, won, type AgreementId } from '@/lib/membership-plans'
import { kstToday } from '@/lib/date'
import { cx } from '@/components/ui/utils'

type AgreementState = Record<AgreementId, boolean>

const EMPTY_AGREEMENTS: AgreementState = {
  terms: false,
  privacy: false,
  refund: false,
  safety: false,
  marketing: false,
  photo: false,
}

const STEP_LABELS = ['기본 정보', '약관 · 동의', '확인 · 서명']

export default function MemberRegisterPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [classOptions, setClassOptions] = useState<string[]>([])

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [startDate, setStartDate] = useState(kstToday())
  const [plan, setPlan] = useState(PLANS[1].id)
  const [termMonths, setTermMonths] = useState(TERMS[0].months)
  const [classes, setClasses] = useState<string[]>([])
  const [agreements, setAgreements] = useState<AgreementState>(EMPTY_AGREEMENTS)
  const [openAgreement, setOpenAgreement] = useState<AgreementId | null>(null)
  const [signature, setSignature] = useState('')

  const [stepError, setStepError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ url: string } | null>(null)

  // Real class template titles, not the design's hardcoded demo list --
  // see lib/membership-plans.ts's own comment on why.
  useEffect(() => {
    listTemplatesWithUpcomingSessions().then(({ templates }) => {
      setClassOptions(Array.from(new Set(templates.map((t) => t.title))))
    })
  }, [])

  // 3단계까지 채운 뒤 실수로 다른 탭을 눌러 서명까지 전부 날아간 사례가
  // 있었다 (QA 전수검사 2026-08-08, 항목 18). beforeunload는 브라우저의
  // 실제 페이지 이탈(새로고침·탭 닫기·주소창에 새 URL 입력)만 잡고 앱
  // 내부의 Next.js 클라이언트 사이드 라우팅(하단 탭 클릭)은 잡지 못하지만,
  // 이 앱에 라우트 전환을 가로챌 표준 수단이 없는 상태에서(Next 문서에도
  // 없음) 가장 위험한 이탈 경로(뒤로가기/새로고침/탭 닫기)만이라도 막는
  // 게 아예 안 막는 것보다 낫다. fullName/phone 둘 다 비어있으면(아직
  // 아무것도 안 쓴 상태) 경고하지 않는다 -- 빈 폼을 실수로 닫는 건 잃을
  // 게 없다.
  useEffect(() => {
    if (result || (!fullName.trim() && !phone.trim())) return
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [fullName, phone, result])

  const price = computeMembershipPrice(plan, termMonths)
  const selectedPlan = PLANS.find((p) => p.id === plan) ?? PLANS[1]
  const selectedTerm = TERMS.find((t) => t.months === termMonths) ?? TERMS[0]

  function toggleClass(title: string) {
    setClasses((prev) => (prev.includes(title) ? prev.filter((c) => c !== title) : [...prev, title]))
  }

  function goNext() {
    if (step === 1) {
      if (!fullName.trim() || !phone.trim()) {
        setStepError('이름과 전화번호를 입력해주세요.')
        return
      }
      setStepError(null)
      setStep(2)
      return
    }
    const requiredMissing = AGREEMENTS.filter((a) => a.required && !agreements[a.id])
    if (requiredMissing.length > 0) {
      setStepError('필수 항목에 모두 동의해야 등록할 수 있습니다.')
      return
    }
    setStepError(null)
    setStep(3)
  }

  function goBack() {
    setStepError(null)
    setStep((s) => (s === 3 ? 2 : 1))
  }

  const allAgreed = AGREEMENTS.every((a) => agreements[a.id])
  function toggleAll() {
    const next = { ...agreements }
    AGREEMENTS.forEach((a) => {
      next[a.id] = !allAgreed
    })
    setAgreements(next)
  }

  // 서명 검증까지 통과한 뒤에만 확인 다이얼로그를 연다 -- 등록은 회원권
  // 기간·결제 금액이 그대로 기록되는 이벤트라 마지막으로 한 번 더 묻는다.
  function handleSubmit() {
    if (!signature.trim()) {
      setStepError('서명란에 회원 성명을 입력해주세요.')
      return
    }
    setStepError(null)
    setConfirming(true)
  }

  async function submitRegistration() {
    setConfirming(false)
    setSubmitting(true)
    const res = await registerMember({
      fullName,
      phone,
      email,
      plan,
      termMonths,
      startDate,
      classes,
      totalPrice: price.total,
      agreements,
      signatureName: signature,
    })
    setSubmitting(false)
    if ('error' in res) {
      setStepError(res.error)
      return
    }
    setResult(res)
  }

  function resetForm() {
    setStep(1)
    setFullName('')
    setPhone('')
    setEmail('')
    setStartDate(kstToday())
    setPlan(PLANS[1].id)
    setTermMonths(TERMS[0].months)
    setClasses([])
    setAgreements(EMPTY_AGREEMENTS)
    setOpenAgreement(null)
    setSignature('')
    setStepError(null)
    setConfirming(false)
    setResult(null)
  }

  if (result) {
    return (
      <div className="w-full px-6 py-12">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-brand-tint">
            <Check className="h-[19px] w-[19px] text-brand-deep" strokeWidth={1.75} />
          </span>
          <h1 className="text-heading-lg text-ink">등록 완료</h1>
        </div>
        <Card>
          <p className="text-body-strong text-ink">{fullName} 회원님이 등록되었습니다</p>
          <p className="mt-2 text-body-md text-body">
            아래 링크를 회원에게 전달해주세요. 회원이 이 링크로 본인 비밀번호를 설정하면 앱을 바로 이용할 수
            있습니다.
          </p>
          <p className="mt-4 break-all rounded-card bg-surface-soft px-4 py-3 text-body-md text-ink">
            <a href={result.url} className="text-brand-deep underline">
              {result.url}
            </a>
          </p>
          <div className="mt-4 flex flex-col gap-2 border-t border-hairline-soft pt-4">
            <SummaryRow label="회원권" value={`${selectedPlan.label} · ${selectedTerm.label.split(' ')[0]}`} />
            <SummaryRow label="개시일" value={startDate} />
            <SummaryRow label="결제 금액" value={won(price.total)} />
          </div>
        </Card>
        <Button href="/admin/roster/members" variant="secondary" className="mt-4 w-full">
          회원 목록으로
        </Button>
        <button type="button" onClick={resetForm} className="mx-auto mt-4 block text-body-md text-muted underline">
          회원 한 명 더 등록
        </button>
      </div>
    )
  }

  return (
    <div className="w-full px-6 py-12">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-brand-tint">
          <UserPlus className="h-[19px] w-[19px] text-brand-deep" strokeWidth={1.75} />
        </span>
        <h1 className="text-heading-lg text-ink">회원 등록</h1>
      </div>

      <div className="mb-6 flex items-center gap-2">
        {STEP_LABELS.map((label, i) => {
          const active = step >= i + 1
          return (
            <div key={label} className="flex flex-1 flex-col gap-1.5">
              <span className={cx('h-[3px] rounded-full', active ? 'bg-brand-deep' : 'bg-hairline')} />
              <span className={cx('text-caption', active ? 'text-brand-deep' : 'text-muted')}>{label}</span>
            </div>
          )
        })}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <Field label="이름">
            <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="회원 이름" />
          </Field>
          <Field label="전화번호">
            <TextInput
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="010-0000-0000"
            />
          </Field>
          <Field label="이메일">
            <TextInput
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="초대 링크를 전달받을 주소"
            />
          </Field>
          <Field label="가입일자 (회원권 개시일)">
            <TextInput value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" />
          </Field>

          <Field label="주 이용 횟수">
            <div className="grid grid-cols-2 gap-2">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={plan === p.id}
                  onClick={() => setPlan(p.id)}
                  className={cx(
                    // bg-surface(흰색), not bg-canvas: 캔버스색 박스는 배경에
                    // 묻혀 회색으로 보였다 -- 선택형 박스들은 전부 흰 면으로.
                    'flex flex-col items-start gap-0.5 rounded-input border px-3 py-2.5 text-left',
                    plan === p.id ? 'border-brand-deep bg-brand-tint' : 'border-hairline bg-surface'
                  )}
                >
                  <span className={cx('text-body-strong', plan === p.id ? 'text-brand-deep' : 'text-ink')}>
                    {p.label}
                  </span>
                  <span className="text-caption text-muted">{won(p.monthly)} / 월</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="수강 기간">
            <div className="flex overflow-hidden rounded-input border border-hairline">
              {TERMS.map((t) => (
                <button
                  key={t.months}
                  type="button"
                  aria-pressed={termMonths === t.months}
                  onClick={() => setTermMonths(t.months)}
                  className={cx(
                    'flex-1 py-2.5 text-caption',
                    termMonths === t.months ? 'bg-brand-tint text-brand-deep' : 'bg-surface text-body'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          {classOptions.length > 0 && (
            <Field label="수강 클래스 (복수 선택)">
              <div className="flex flex-wrap gap-2">
                {classOptions.map((title) => {
                  const picked = classes.includes(title)
                  return (
                    <button
                      key={title}
                      type="button"
                      aria-pressed={picked}
                      onClick={() => toggleClass(title)}
                      className={cx(
                        'rounded-full border px-3.5 py-1.5 text-caption',
                        picked ? 'border-brand-deep bg-brand-tint text-brand-deep' : 'border-hairline bg-surface text-body'
                      )}
                    >
                      {title}
                    </button>
                  )
                })}
              </div>
            </Field>
          )}

          <Card>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body-strong text-ink">결제 예정 금액</span>
              <span className="text-heading-lg text-ink">{won(price.total)}</span>
            </div>
            <p className="mt-1.5 text-caption text-muted">
              {selectedTerm.discount > 0
                ? `정상가 ${won(price.gross)} · ${Math.round(selectedTerm.discount * 100)}% 기간 할인 적용 · 부가세 포함`
                : '부가세 포함 · 기간 할인 없음'}
            </p>
          </Card>

          {stepError && (
            <p role="alert" className="text-body-md text-danger">
              {stepError}
            </p>
          )}
          <Button onClick={goNext} className="w-full">
            다음 — 약관 및 동의
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          <p className="text-body-md text-body">
            아래 내용을 회원에게 보여주고 동의를 받습니다. 각 항목을 눌러 전문을 확인할 수 있습니다.
          </p>

          <button
            type="button"
            onClick={toggleAll}
            className={cx(
              'flex items-center gap-2.5 rounded-input border px-3.5 py-3',
              allAgreed ? 'border-brand-deep bg-brand-tint' : 'border-hairline bg-surface'
            )}
          >
            <AgreementDot checked={allAgreed} />
            <span className="text-body-strong text-ink">전체 동의 (선택 항목 포함)</span>
          </button>

          {AGREEMENTS.map((a) => {
            const checked = agreements[a.id]
            const open = openAgreement === a.id
            return (
              <div key={a.id} className="overflow-hidden rounded-card border border-hairline bg-surface">
                <div className="flex items-center gap-2.5 p-3.5">
                  <button
                    type="button"
                    aria-label="동의"
                    onClick={() => setAgreements((prev) => ({ ...prev, [a.id]: !checked }))}
                  >
                    <AgreementDot checked={checked} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenAgreement(open ? null : a.id)}
                    className="flex flex-1 items-center justify-between gap-2 text-left"
                  >
                    <span>
                      <span className="block text-body-strong text-ink">{a.title}</span>
                      <span className={cx('block text-caption', a.required ? 'text-warning' : 'text-muted')}>
                        {a.required ? '필수' : '선택'}
                      </span>
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className={cx('h-4 w-4 shrink-0 text-muted transition-transform', open && 'rotate-90')}
                      strokeWidth={1.75}
                    />
                  </button>
                </div>
                {open && (
                  <div className="max-h-56 overflow-y-auto border-t border-hairline-soft bg-surface-soft p-3.5">
                    {a.body.map((line, i) => (
                      <p key={i} className="mb-2 text-caption text-body last:mb-0">
                        {line}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {stepError && (
            <p role="alert" className="text-body-md text-danger">
              {stepError}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={goBack} className="w-24 shrink-0">
              이전
            </Button>
            <Button onClick={goNext} className="flex-1">
              다음 — 확인 및 서명
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-3">
          <Card>
            <p className="mb-3 text-body-strong text-ink">가입 내용 확인</p>
            <div className="flex flex-col gap-2">
              <SummaryRow label="이름" value={fullName || '—'} />
              <SummaryRow label="전화번호" value={phone || '—'} />
              <SummaryRow label="이메일" value={email || '—'} />
              <SummaryRow label="개시일" value={startDate} />
              <SummaryRow label="회원권" value={`${selectedPlan.label} · ${selectedTerm.label.split(' ')[0]}`} />
              <SummaryRow label="수강 클래스" value={classes.length ? classes.join(', ') : '전체 클래스'} />
              <SummaryRow label="결제 금액" value={won(price.total)} />
            </div>
          </Card>

          <Card>
            <p className="mb-2 text-body-strong text-ink">동의 내역</p>
            <div className="flex flex-col gap-2">
              {AGREEMENTS.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2">
                  <span className="text-caption text-body">{a.title}</span>
                  <span
                    className={cx(
                      'shrink-0 rounded-full px-2.5 py-0.5 text-caption',
                      agreements[a.id] ? 'bg-success-tint text-success' : 'bg-surface-soft text-muted'
                    )}
                  >
                    {agreements[a.id] ? '동의' : a.required ? '미동의' : '미동의 (선택)'}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="text-body-strong text-ink">서명</p>
            <p className="mt-1.5 mb-3 text-caption text-body">
              본인은 위 가입 내용과 동의 내역을 확인하였으며, 요가원 이용약관·환불 규정·안전 주의사항에 동의합니다.
              아래에 성명을 입력하면 전자서명으로 갈음합니다.
            </p>
            <TextInput
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="회원 성명 입력"
              className="h-12 bg-surface-soft text-heading-md"
            />
            <p className="mt-2 text-caption text-muted">서명일 {kstToday()}</p>
          </Card>

          {stepError && (
            <p role="alert" className="text-body-md text-danger">
              {stepError}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={goBack} className="w-24 shrink-0">
              이전
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
              {submitting ? '등록하는 중...' : '회원 등록 완료'}
            </Button>
          </div>
          <p className="text-caption text-muted">가입동의서 내역은 요가원이 보관합니다.</p>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title={`${fullName} 회원님을 등록할까요?`}
        description="등록하면 회원권이 개시되고 비밀번호 설정 링크가 생성됩니다."
        confirmLabel="등록"
        onConfirm={submitRegistration}
        onCancel={() => setConfirming(false)}
      >
        <div className="mt-3 flex flex-col gap-2 rounded-card bg-surface-soft p-3.5">
          <SummaryRow label="회원권" value={`${selectedPlan.label} · ${selectedTerm.label.split(' ')[0]}`} />
          <SummaryRow label="개시일" value={startDate} />
          <SummaryRow label="결제 금액" value={won(price.total)} />
        </div>
      </ConfirmDialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-label text-muted">{label}</label>
      {children}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-hairline-soft pt-2 first:border-t-0 first:pt-0">
      <span className="shrink-0 text-caption text-muted">{label}</span>
      <span className="text-right text-body-strong text-ink">{value}</span>
    </div>
  )
}

function AgreementDot({ checked }: { checked: boolean }) {
  return (
    <span
      className={cx(
        'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border',
        checked ? 'border-brand-deep bg-brand-deep' : 'border-hairline bg-surface'
      )}
    >
      {checked && <Check aria-hidden="true" className="h-3 w-3 text-on-brand" strokeWidth={3} />}
    </span>
  )
}
