'use client'

import { Suspense, useState, useTransition } from 'react'
import Link from 'next/link'
import { Search, AlertCircle } from 'lucide-react'
import { findEmailByNamePhone } from '@/lib/actions/auth'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/TextInput'

export default function FindEmailPage() {
  return (
    <Suspense fallback={null}>
      <FindEmailForm />
    </Suspense>
  )
}

function FindEmailForm() {
  const [error, setError] = useState<string | null>(null)
  const [foundEmail, setFoundEmail] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    setFoundEmail(null)
    startTransition(async () => {
      const result = await findEmailByNamePhone(formData)
      if ('error' in result) {
        setError(result.error)
      } else {
        setFoundEmail(result.email)
      }
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-display-lg text-ink">이메일 찾기</h1>
        <p className="mb-7 text-body-md text-muted">
          가입할 때 등록한 이름과 전화번호로 로그인 이메일을 확인합니다.
        </p>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <TextInput name="fullName" placeholder="이름" required />
          <TextInput name="phone" type="tel" placeholder="전화번호" required />
          <Button type="submit" disabled={isPending} icon={Search} className="mt-2 w-full">
            이메일 찾기
          </Button>
        </form>

        {foundEmail && (
          <div className="mt-5 rounded-card border border-hairline bg-surface-soft p-4">
            <p className="text-caption text-muted">등록된 이메일</p>
            <p className="mt-1.5 mb-4 text-heading-md text-ink">{foundEmail}</p>
            <Button href="/login" variant="secondary" className="w-full">
              이 이메일로 로그인
            </Button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-center gap-2.5 rounded-card bg-danger-tint px-4 py-3.5 text-body-strong text-danger"
          >
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
            {error}
          </div>
        )}

        <div className="mt-7 flex justify-center gap-4">
          <Link href="/find-password" className="text-body-md text-ink underline">
            비밀번호 찾기
          </Link>
          <Link href="/login" className="text-body-md text-muted underline">
            로그인
          </Link>
        </div>
      </div>
    </div>
  )
}
