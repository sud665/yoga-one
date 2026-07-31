'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { acceptInviteWithPassword } from '@/lib/actions/invites'
import { signInWithKakao } from '@/lib/actions/auth'

export function InviteAcceptForm({ code, role }: { code: string; role: 'instructor' | 'member' }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await acceptInviteWithPassword(code, formData)
      if ('error' in result) {
        setError(result.error)
        return
      }
      router.push('/')
    })
  }

  return (
    <div>
      <form action={handleSubmit} className="flex flex-col gap-4">
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
          {role === 'instructor' ? '강사로 가입하기' : '회원으로 가입하기'}
        </button>
      </form>
      <button
        onClick={() => signInWithKakao({ pendingInviteCode: code })}
        className="mt-3 w-full rounded-full bg-zinc-100 px-8 py-3 text-base font-medium text-black transition hover:bg-zinc-200"
      >
        카카오로 가입
      </button>
    </div>
  )
}
