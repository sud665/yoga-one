'use client'

import { useState, useTransition } from 'react'
import { signUpOwnerWithPassword, signInWithKakao } from '@/lib/actions/auth'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [studioName, setStudioName] = useState('')

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await signUpOwnerWithPassword(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-3xl font-bold uppercase tracking-tight text-black">
          요가원 시작하기
        </h1>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input
            name="studioName"
            value={studioName}
            onChange={(e) => setStudioName(e.target.value)}
            placeholder="요가원 이름"
            required
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black"
          />
          <input
            name="fullName"
            placeholder="이름"
            required
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black"
          />
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
            minLength={8}
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
            가입하기
          </button>
        </form>
        <button
          onClick={() => signInWithKakao({ pendingStudioName: studioName })}
          className="mt-3 w-full rounded-full bg-zinc-100 px-8 py-3 text-base font-medium text-black transition hover:bg-zinc-200"
        >
          카카오로 가입
        </button>
      </div>
    </div>
  )
}
