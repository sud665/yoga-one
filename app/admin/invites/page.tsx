'use client'

import { useState, useTransition, useEffect } from 'react'
import { createInvite, listInvites } from '@/lib/actions/invites'
import type { Invite } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Plus } from 'lucide-react'

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[] | null>(null)
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
      <h1 className="mb-8 text-heading-lg text-ink">초대 관리</h1>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button icon={Plus} onClick={() => handleCreate('instructor')} disabled={isPending}>
          강사 초대 링크 발급
        </Button>
        <Button variant="secondary" icon={Plus} onClick={() => handleCreate('member')} disabled={isPending}>
          회원 초대 링크 발급
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-body-md text-danger">
          {error}
        </p>
      )}

      {generatedUrl && (
        <p className="mt-6 break-all rounded-card bg-surface-soft px-4 py-3 text-body-md text-ink">
          발급된 링크:{' '}
          <a href={generatedUrl} className="text-body-strong text-brand-deep underline">
            {generatedUrl}
          </a>
        </p>
      )}

      {invites === null ? (
        <div className="mt-10 flex flex-col gap-3">
          <Skeleton variant="block" className="h-14" />
          <Skeleton variant="block" className="h-14" />
        </div>
      ) : invites.length === 0 ? (
        <EmptyState className="mt-10" title="발급된 초대가 없습니다" description="위 버튼으로 초대 링크를 발급해보세요." />
      ) : (
        // Row anatomy: who it invites + whether it still works on the top
        // line, the code and expiry as metadata below. The dot-separated
        // sentence this replaces also leaked the raw enum ('instructor') as
        // the row's lead word.
        <ul className="mt-10 flex flex-col">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline py-4 first:border-t-0"
            >
              <div>
                <p className="text-body-strong text-ink">
                  {invite.role === 'instructor' ? '강사 초대' : '회원 초대'}
                </p>
                <p className="mt-0.5 text-caption text-muted">
                  <span className="font-mono">{invite.code}</span> · {invite.expires_at}까지
                </p>
              </div>
              {/* A consumed invite is spent, not queued -- `waitlisted` put a
                  clock on it, which read as "still waiting to be used". */}
              <StatusBadge tone={invite.used_at ? 'neutral' : 'success'}>
                {invite.used_at ? '사용됨' : '미사용'}
              </StatusBadge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
