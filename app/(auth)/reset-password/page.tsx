'use client'

import { useState, useTransition } from 'react'
import { KeyRound, Check } from 'lucide-react'
import { updatePasswordAfterReset } from '@/lib/actions/auth'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/TextInput'

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await updatePasswordAfterReset(formData)
      if ('error' in result) {
        setError(result.error)
      } else {
        setDone(true)
      }
    })
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint">
            <Check className="h-6 w-6 text-brand-deep" strokeWidth={2} />
          </div>
          <h1 className="mb-3 text-heading-lg text-ink">비밀번호를 변경했습니다</h1>
          <p className="mb-8 text-body-md text-muted">새 비밀번호로 다시 로그인해주세요.</p>
          <Button href="/login" className="w-full">
            로그인하기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-surface-soft">
          <KeyRound className="h-5 w-5 text-muted" strokeWidth={1.75} />
        </div>
        <h1 className="mb-2 text-display-lg leading-tight text-ink">
          새 비밀번호
          <br />
          설정
        </h1>
        <p className="mb-7 text-body-md text-muted">8자 이상으로 설정해주세요.</p>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <TextInput name="password" type="password" placeholder="새 비밀번호" required minLength={8} />
          <TextInput name="passwordConfirm" type="password" placeholder="새 비밀번호 확인" required minLength={8} />
          {error && (
            <p role="alert" className="text-body-md text-danger">
              {error}
            </p>
          )}
          <Button type="submit" disabled={isPending} className="mt-2 w-full">
            비밀번호 변경
          </Button>
        </form>
      </div>
    </div>
  )
}
