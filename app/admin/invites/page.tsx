'use client'

import { useState, useTransition, useEffect } from 'react'
import { createInvite, listInvites } from '@/lib/actions/invites'
import type { Invite } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { Copy, Mail, Plus } from 'lucide-react'

// expires_at is a raw Postgres timestamptz ('2026-08-15T10:50:49.486+00:00')
// -- rendered verbatim before this, unlike every other date in the app (QA
// sweep 2026-08-08, item 15). Formatted in KST for the same reason
// ChatRoomScreen.tsx's formatTime is: a Korean user's wall clock, not the
// server's UTC instant.
function formatExpiry(iso: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(new Date(iso))
}

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[] | null>(null)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  async function handleCopy(code: string) {
    const url = `${window.location.origin}/invite/${code}`
    await navigator.clipboard.writeText(url)
    toast({ title: '링크를 복사했습니다', tone: 'success' })
  }

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
    <div className="w-full px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-brand-tint">
          <Mail className="h-[19px] w-[19px] text-brand-deep" strokeWidth={1.75} />
        </span>
        <h1 className="text-heading-lg text-ink">초대 관리</h1>
      </div>

      <div className="flex flex-col gap-3">
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
        <p className="mt-6 break-all rounded-card border border-hairline bg-surface px-4 py-3 text-body-md text-ink shadow-elev-1">
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
                  <span className="font-mono">{invite.code}</span> · {formatExpiry(invite.expires_at)}까지
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* 발급 직후에만 보이던 링크가 화면을 벗어나면 다시 볼 방법이
                    없었다 -- 코드는 목록에 남으니 같은 URL을 그대로
                    재구성해 복사할 수 있게 한다 (QA 전수검사 2026-08-08,
                    항목 15). 사용된 초대는 다시 나눠줄 이유가 없으니 숨긴다. */}
                {!invite.used_at && (
                  <button
                    type="button"
                    aria-label="초대 링크 복사"
                    onClick={() => handleCopy(invite.code)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-surface text-muted transition-colors hover:bg-surface-soft hover:text-ink"
                  >
                    <Copy aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                )}
                {/* A consumed invite is spent, not queued -- `waitlisted` put a
                    clock on it, which read as "still waiting to be used". */}
                <StatusBadge tone={invite.used_at ? 'neutral' : 'success'}>
                  {invite.used_at ? '사용됨' : '미사용'}
                </StatusBadge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
