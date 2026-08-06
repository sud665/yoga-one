'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

import { getOrCreateDm, listDmCandidates, type DmCandidate } from '@/lib/actions/chat'
import { roleHomePath } from '@/lib/role-home'
import type { ProfileRole } from '@/lib/types'

const ROLE_LABEL: Record<ProfileRole, string> = { owner: '원장', instructor: '강사', member: '회원' }

export function NewChatScreen({ role }: { role: ProfileRole }) {
  const base = roleHomePath(role)
  const router = useRouter()
  const [candidates, setCandidates] = useState<DmCandidate[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    listDmCandidates().then(setCandidates)
  }, [])

  function handlePick(profileId: string) {
    setError(null)
    startTransition(async () => {
      const result = await getOrCreateDm(profileId)
      if ('error' in result) {
        setError(result.error)
        return
      }
      router.push(`${base}/chat/${result.conversationId}`)
    })
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`${base}/chat`} aria-label="뒤로" className="rounded-full p-1.5 text-ink hover:bg-surface-soft">
          <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
        </Link>
        <h1 className="text-heading-lg text-ink">새 채팅</h1>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-body-md text-danger">
          {error}
        </p>
      )}

      {candidates === null ? (
        <p className="text-body-md text-muted">불러오는 중...</p>
      ) : candidates.length === 0 ? (
        <p className="text-body-md text-muted">대화를 시작할 수 있는 사람이 없습니다.</p>
      ) : (
        <div className="flex flex-col">
          {candidates.map((candidate) => (
            <button
              key={candidate.profileId}
              type="button"
              disabled={isPending}
              onClick={() => handlePick(candidate.profileId)}
              className="flex items-center gap-3 border-t border-hairline py-3.5 text-left first:border-t-0 disabled:opacity-50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-body-strong text-brand-deep">
                {candidate.fullName.slice(0, 1)}
              </span>
              <span className="flex-1">
                <span className="block text-body-strong text-ink">{candidate.fullName}</span>
                <span className="block text-utility-xs text-muted">{ROLE_LABEL[candidate.role]}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
