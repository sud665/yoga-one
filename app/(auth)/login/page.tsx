'use client'

import { Suspense, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { signInWithPassword, signInWithKakao } from '@/lib/actions/auth'

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

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await signInWithPassword(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-3xl font-bold uppercase tracking-tight text-black">로그인</h1>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input
            name="email"
            type="email"
            placeholder="이메일"
            required
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black"
          />
          <input
            name="password"
            type="password"
            placeholder="비밀번호"
            required
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black"
          />
          {error && (
            <p role="alert" className="text-sm text-[#d30005]">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="mt-2 w-full rounded-full bg-black px-8 py-3 text-base font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            로그인
          </button>
        </form>
        <button
          onClick={() => signInWithKakao()}
          className="mt-3 w-full rounded-full bg-zinc-100 px-8 py-3 text-base font-medium text-black transition hover:bg-zinc-200"
        >
          카카오로 로그인
        </button>
        {kakaoError && (
          <p role="alert" className="mt-4 text-sm text-[#d30005]">
            카카오 로그인에 실패했습니다. 이메일로 로그인해주세요.
          </p>
        )}
      </div>
    </div>
  )
}
