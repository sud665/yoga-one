'use client'

import { useState, useTransition, useEffect } from 'react'
import { createInvite, listInvites } from '@/lib/actions/invites'
import type { Invite } from '@/lib/types'

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    listInvites().then(setInvites)
  }, [])

  function handleCreate(role: 'instructor' | 'member') {
    setError(null)
    setGeneratedUrl(null)
    startTransition(async () => {
      const result = await createInvite(role)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setGeneratedUrl(result.url)
      setInvites(await listInvites())
    })
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-medium text-black">초대 관리</h1>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => handleCreate('instructor')}
          disabled={isPending}
          className="rounded-full bg-black px-8 py-3 text-base font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          강사 초대 링크 발급
        </button>
        <button
          onClick={() => handleCreate('member')}
          disabled={isPending}
          className="rounded-full bg-zinc-100 px-8 py-3 text-base font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          회원 초대 링크 발급
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-[#d30005]">
          {error}
        </p>
      )}

      {generatedUrl && (
        <p className="mt-6 break-all rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-black">
          발급된 링크:{' '}
          <a href={generatedUrl} className="font-medium underline">
            {generatedUrl}
          </a>
        </p>
      )}

      <ul className="mt-10 flex flex-col">
        {invites.map((invite) => (
          <li
            key={invite.id}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-zinc-200 py-4 text-sm text-black first:border-t-0"
          >
            <span className="font-medium">{invite.role}</span>
            <span className="text-zinc-400">·</span>
            <span className="font-mono text-zinc-600">{invite.code}</span>
            <span className="text-zinc-400">·</span>
            <span className={invite.used_at ? 'text-zinc-500' : 'text-[#007d48]'}>
              {invite.used_at ? '사용됨' : '미사용'}
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-500">만료 {invite.expires_at}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
