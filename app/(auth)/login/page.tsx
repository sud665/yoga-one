'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ROLE_LOGIN_COPY } from './login-form'

// Role picker only -- the actual email/password + Kakao form lives on each
// role's own page (login-form.tsx) now. This page stays reachable at
// `/login` because proxy.ts redirects any unauthenticated request straight
// here, and /auth/callback falls back here too whenever a Kakao failure
// happens deep enough in the OAuth round-trip that it no longer knows which
// of the 3 role pages the attempt started from (see signInWithKakao's
// errorRedirectTo in lib/actions/auth.ts for the common case that does).
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginChooser />
    </Suspense>
  )
}

function LoginChooser() {
  const searchParams = useSearchParams()
  const kakaoError = searchParams.get('kakaoError')
  const signupError = searchParams.get('signupError')

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-display-lg text-ink">로그인</h1>
        <div className="flex flex-col gap-3">
          {(Object.keys(ROLE_LOGIN_COPY) as Array<keyof typeof ROLE_LOGIN_COPY>).map((role) => (
            <Button key={role} href={ROLE_LOGIN_COPY[role].path} className="w-full">
              {ROLE_LOGIN_COPY[role].title}
            </Button>
          ))}
        </div>
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
