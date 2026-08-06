'use client'

import { Suspense, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, AlertCircle } from 'lucide-react'
import { requestPasswordReset } from '@/lib/actions/auth'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/TextInput'

export default function FindPasswordPage() {
  return (
    <Suspense fallback={null}>
      <FindPasswordForm />
    </Suspense>
  )
}

function FindPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const searchParams = useSearchParams()
  // Set by /auth/reset/route.ts when the emailed link's code is missing or
  // already expired/used -- distinct from this form's own `error` state,
  // which only ever covers submitting the request below.
  const resetError = searchParams.get('resetError')

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await requestPasswordReset(formData)
      if ('error' in result) {
        setError(result.error)
      } else {
        setSentTo(result.email)
      }
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-display-lg text-ink">비밀번호 찾기</h1>
        <p className="mb-7 text-body-md text-muted">
          가입한 이메일로 재설정 링크를 보냅니다. 링크는 1시간 동안 유효합니다.
        </p>

        {resetError && (
          <div
            role="alert"
            className="mb-5 flex items-center gap-2.5 rounded-card bg-danger-tint px-4 py-3.5 text-body-strong text-danger"
          >
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
            재설정 링크가 만료되었거나 유효하지 않습니다. 다시 시도해주세요.
          </div>
        )}

        {sentTo ? (
          <div className="rounded-card border border-hairline bg-surface-soft p-4">
            <p className="text-heading-md text-ink">메일을 확인해주세요</p>
            <p className="mt-1.5 text-body-md text-body">
              {sentTo}(으)로 재설정 링크를 보냈습니다. 메일이 오지 않으면 스팸함을 확인해주세요.
            </p>
          </div>
        ) : (
          <form action={handleSubmit} className="flex flex-col gap-4">
            <TextInput name="email" type="email" placeholder="이메일" required />
            <Button type="submit" disabled={isPending} icon={Mail} className="mt-2 w-full">
              재설정 링크 받기
            </Button>
            {error && (
              <p role="alert" className="text-body-md text-danger">
                {error}
              </p>
            )}
          </form>
        )}

        <div className="mt-7 flex justify-center gap-4">
          <Link href="/find-email" className="text-body-md text-ink underline">
            이메일 찾기
          </Link>
          <Link href="/login" className="text-body-md text-muted underline">
            로그인
          </Link>
        </div>
      </div>
    </div>
  )
}
