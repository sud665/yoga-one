'use client'

import { Suspense, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signInWithPassword, signInWithKakao } from '@/lib/actions/auth'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/TextInput'

// One form for all three roles -- there is nothing left for a role picker to
// gate. Instructor/member accounts only ever exist via an accepted invite
// and an owner account only ever exists via /signup, so by the time someone
// reaches this form their role is already fixed to their account; the only
// thing left to do is authenticate them and let signInWithPassword redirect
// to whichever role home their profile actually has.
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
    <div className="flex min-h-full items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-display-lg text-ink">로그인</h1>
        <p className="mb-8 text-center text-caption text-muted">
          초대받은 이메일과 원장 계정으로만 로그인할 수 있습니다.
        </p>
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
        <div className="mt-6 flex items-center justify-center gap-3 text-label text-muted">
          <Link href="/find-email">이메일 찾기</Link>
          <span className="h-3 w-px bg-hairline" aria-hidden="true" />
          <Link href="/find-password">비밀번호 찾기</Link>
          <span className="h-3 w-px bg-hairline" aria-hidden="true" />
          <Link href="/signup">회원가입</Link>
        </div>
      </div>
    </div>
  )
}
