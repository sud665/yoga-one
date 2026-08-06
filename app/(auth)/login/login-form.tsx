'use client'

import { Suspense, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signInWithPassword, signInWithKakao } from '@/lib/actions/auth'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/TextInput'

export const ROLE_LOGIN_COPY = {
  owner: { title: '원장 로그인', path: '/login/owner' },
  instructor: { title: '강사 로그인', path: '/login/instructor' },
  member: { title: '회원 로그인', path: '/login/member' },
} as const

export type LoginRole = keyof typeof ROLE_LOGIN_COPY

// One shared form for all three role entry points: the underlying auth
// (signInWithPassword/signInWithKakao) is role-agnostic -- proxy.ts already
// redirects a signed-in user to their real role's home regardless of which
// page they logged in from -- so `role` only picks the heading and the
// Kakao failure redirect, never gates who can submit.
export function RoleLoginPage({ role }: { role: LoginRole }) {
  return (
    <Suspense fallback={null}>
      <LoginForm role={role} />
    </Suspense>
  )
}

function LoginForm({ role }: { role: LoginRole }) {
  const { title, path } = ROLE_LOGIN_COPY[role]
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
        {/* display-lg, used sparingly per DESIGN.md -- login is one of only a
            handful of screens in the app that reach for it. Plain Inter at
            weight 500, no uppercase/tracking-tight treatment. */}
        <h1 className="mb-8 text-display-lg text-ink">{title}</h1>
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
        <Button
          variant="secondary"
          onClick={() => signInWithKakao({ errorRedirectTo: path })}
          className="mt-3 w-full"
        >
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
        <Link href="/login" className="mt-5 block text-center text-body-md text-ink underline">
          다른 유형으로 로그인
        </Link>
      </div>
    </div>
  )
}
