'use client'

import { Suspense, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { signInWithPassword, signInWithKakao } from '@/lib/actions/auth'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/TextInput'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const searchParams = useSearchParams()
  const kakaoError = searchParams.get('kakaoError')
  const signupError = searchParams.get('signupError')

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await signInWithPassword(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-sm">
        {/* display-lg, used sparingly per DESIGN.md -- this login headline
            is one of only a handful of screens in the whole app that reach
            for it (the rest use heading-lg page titles). No more uppercase/
            tracking-tight Bebas-era treatment: plain Inter at weight 500,
            the system's own ceiling ("display 사이즈에 500보다 굵은 weight를
            쓰지 않는다"). */}
        <h1 className="mb-8 text-display-lg text-ink">로그인</h1>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <TextInput name="email" type="email" placeholder="이메일" required />
          <TextInput name="password" type="password" placeholder="비밀번호" required />
          {error && (
            <p role="alert" className="text-body-md text-danger">
              {error}
            </p>
          )}
          <Button type="submit" disabled={isPending} className="mt-2 w-full">
            로그인
          </Button>
        </form>
        <Button variant="secondary" onClick={() => signInWithKakao()} className="mt-3 w-full">
          카카오로 로그인
        </Button>
        {kakaoError && (
          <p role="alert" className="mt-4 text-body-md text-danger">
            카카오 로그인에 실패했습니다. 이메일로 로그인해주세요.
          </p>
        )}
        {signupError && (
          <p role="alert" className="mt-4 text-body-md text-danger">
            회원가입 처리 중 문제가 발생했습니다. 다시 시도하거나 고객센터에 문의해주세요.
          </p>
        )}
      </div>
    </div>
  )
}
