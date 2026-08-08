import Link from 'next/link'
import { Megaphone, Pin } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { listNotices } from '@/lib/actions/notices'

// Shared read-only board for all three roles -- RLS (notices: instructor/
// member reads targeted notices, plus the owner's own "for all" policy)
// already filters listNotices() to whatever this caller is allowed to see,
// so this page has no role branching of its own.
export default async function NoticeBoardPage() {
  const notices = await listNotices()

  return (
    <div className="w-full px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-brand-tint">
          <Megaphone className="h-[19px] w-[19px] text-brand-deep" strokeWidth={1.75} />
        </span>
        <h1 className="text-heading-lg text-ink">공지사항</h1>
      </div>

      {notices.length === 0 ? (
        <EmptyState title="등록된 공지가 없습니다" description="새 공지가 올라오면 여기에 표시됩니다." />
      ) : (
        <ul className="flex flex-col">
          {notices.map((notice) => (
            <li key={notice.id} className="border-t border-hairline py-4 first:border-t-0">
              <Link href={`/notices/${notice.id}`} className="block">
                {notice.pin && (
                  <Badge tone="brand" className="mb-1.5 gap-1">
                    <Pin aria-hidden="true" className="h-2.5 w-2.5" strokeWidth={2} />
                    고정
                  </Badge>
                )}
                <p className="text-body-strong text-ink">{notice.title}</p>
                <p className="mt-1 text-caption text-muted">{notice.created_at.slice(0, 10)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
