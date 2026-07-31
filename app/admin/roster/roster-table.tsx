'use client'

import { useState, useEffect } from 'react'
import { listProfilesByRole } from '@/lib/actions/roster'
import { createInvite } from '@/lib/actions/invites'
import type { Profile } from '@/lib/types'

// One shared component for both the instructor and member roster screens --
// the two screens are structurally identical (list + invite-issuance
// shortcut) over a different `profiles.role` value, so `role`/`label` are the
// only things that vary between app/admin/roster/instructors/page.tsx and
// app/admin/roster/members/page.tsx.
export function RosterTable({ role, label }: { role: 'instructor' | 'member'; label: string }) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)

  useEffect(() => {
    listProfilesByRole(role).then(setProfiles)
  }, [role])

  async function handleInvite() {
    const result = await createInvite(role)
    if ('url' in result) setGeneratedUrl(result.url)
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-medium text-black">{label} 관리</h1>

      <button
        onClick={handleInvite}
        className="rounded-full bg-black px-8 py-3 text-base font-medium text-white transition hover:bg-zinc-800"
      >
        {label} 초대 링크 발급
      </button>

      {generatedUrl && (
        <p className="mt-6 break-all rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-black">
          발급된 링크:{' '}
          <a href={generatedUrl} className="font-medium underline">
            {generatedUrl}
          </a>
        </p>
      )}

      <ul className="mt-10 flex flex-col">
        {profiles.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-zinc-200 py-4 text-sm text-black first:border-t-0"
          >
            <span className="font-medium">{p.full_name}</span>
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-500">{p.phone ?? '연락처 미등록'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
