'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function StudioNameOnboardingPage() {
  const [studioName, setStudioName] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { error: rpcError } = await supabase.rpc('create_studio_and_owner_profile', {
        p_studio_name: studioName,
        p_full_name: fullName,
      })
      if (rpcError) {
        setError(rpcError.message)
        return
      }
      router.push('/admin')
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <h1 className="mb-8 text-3xl font-bold uppercase tracking-tight text-black">
          요가원 정보를 입력해주세요
        </h1>
        <div className="flex flex-col gap-4">
          <input
            value={studioName}
            onChange={(e) => setStudioName(e.target.value)}
            placeholder="요가원 이름"
            required
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black"
          />
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="이름"
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
            시작하기
          </button>
        </div>
      </form>
    </div>
  )
}
