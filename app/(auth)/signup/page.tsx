'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { signUpOwnerWithPassword, signInWithKakao } from '@/lib/actions/auth'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/TextInput'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [pendingConfirmation, setPendingConfirmation] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [studioName, setStudioName] = useState('')

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await signUpOwnerWithPassword(formData)
      if (!result) return
      if ('error' in result) {
        setError(result.error)
        return
      }
      if ('pendingConfirmation' in result) {
        setPendingConfirmation(true)
      }
    })
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 font-serif text-headline-lg text-ink">요가원 시작하기</h1>
        {pendingConfirmation ? (
          // 이메일 확인이 필요한 상태 (hosted 프로젝트에서 enable_confirmations=true인
          // 경우) -- lib/actions/invites.ts의 InviteAcceptForm과 동일한 처리.
          <p role="status" className="rounded-card bg-surface-soft px-4 py-3 text-body-strong text-ink">
            이메일을 확인해주세요. 받으신 메일의 링크를 클릭하면 가입이 완료됩니다.
          </p>
        ) : (
          <>
            <form action={handleSubmit} className="flex flex-col gap-4">
              <TextInput
                name="studioName"
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                placeholder="요가원 이름"
                required
              />
              <TextInput name="fullName" placeholder="이름" required />
              <TextInput name="email" type="email" placeholder="이메일" required />
              <TextInput name="password" type="password" placeholder="비밀번호" required minLength={8} />
              {error && (
                <p role="alert" className="text-body-md text-danger">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={isPending} className="mt-2 w-full">
                가입하기
              </Button>
            </form>
            <Button
              variant="secondary"
              onClick={() => signInWithKakao({ pendingStudioName: studioName })}
              className="mt-3 w-full"
            >
              카카오로 가입
            </Button>
            {/* /login already links here ("회원가입") but had no link back --
                a dead end for someone who already has an account and lands
                here by mistake (QA sweep 2026-08-08, item 25). Same
                placement/style as /login's own utility links. */}
            <div className="mt-6 flex items-center justify-center text-label text-muted">
              <Link href="/login">이미 계정이 있으신가요? 로그인</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
