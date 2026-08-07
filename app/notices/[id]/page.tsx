import Link from 'next/link'
import { ArrowLeft, Pin } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { getNotice } from '@/lib/actions/notices'
import type { NoticeTarget } from '@/lib/types'

const TARGET_LABEL: Record<NoticeTarget, string> = { all: '전체', member: '회원', instructor: '강사' }

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getNotice(id)

  if ('error' in result) {
    return (
      <div className="w-full px-6 py-12 text-center">
        <p className="text-heading-md text-ink">{result.error}</p>
        <Link href="/notices" className="mt-4 inline-block text-body-md text-brand-deep underline">
          공지사항 목록으로
        </Link>
      </div>
    )
  }

  const { notice } = result

  return (
    <div className="w-full px-6 py-12">
      <Link href="/notices" className="mb-5 inline-flex items-center gap-1 text-label text-muted">
        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.75} />
        공지사항
      </Link>

      <div className="mb-2.5 flex items-center gap-1.5">
        {notice.pin && (
          <Badge tone="tag-mint" className="gap-1">
            <Pin aria-hidden="true" className="h-2.5 w-2.5" strokeWidth={2} />
            고정
          </Badge>
        )}
        <Badge>{TARGET_LABEL[notice.target]}</Badge>
      </div>

      <h1 className="mb-2 text-heading-lg text-ink">{notice.title}</h1>
      <p className="mb-5 border-b border-hairline pb-5 text-caption text-muted">
        {notice.created_at.slice(0, 10)} · 조회 {notice.views}
      </p>
      <p className="whitespace-pre-line text-body-md leading-relaxed text-body">{notice.body}</p>
    </div>
  )
}
