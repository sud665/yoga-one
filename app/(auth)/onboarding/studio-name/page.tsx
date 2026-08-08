'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/TextInput'

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
        // proxy.ts now keeps a fully logged-out visitor off this page
        // entirely (QA sweep 2026-08-08, item 10), so the raw Postgres
        // "permission denied for function ..." this call used to surface
        // when reached with no session shouldn't be reachable through normal
        // navigation anymore -- mapped anyway as defense in depth rather
        // than trusting that guarantee to hold forever.
        setError(
          rpcError.message.includes('permission denied')
            ? '로그인이 필요합니다. 다시 로그인해주세요.'
            : rpcError.message
        )
        return
      }
      router.push('/admin')
    })
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <h1 className="mb-8 font-serif text-headline-lg text-ink">요가원 정보를 입력해주세요</h1>
        <div className="flex flex-col gap-4">
          <TextInput
            value={studioName}
            onChange={(e) => setStudioName(e.target.value)}
            placeholder="요가원 이름"
            required
          />
          <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="이름" required />
          {error && (
            <p role="alert" className="text-body-md text-danger">
              {error}
            </p>
          )}
          <Button type="submit" disabled={isPending} className="mt-2 w-full">
            시작하기
          </Button>
        </div>
      </form>
    </div>
  )
}
