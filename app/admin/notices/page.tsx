import Link from 'next/link'
import { Megaphone, Pin } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { listNotices } from '@/lib/actions/notices'
import type { NoticeTarget } from '@/lib/types'

const TARGET_LABEL: Record<NoticeTarget, string> = { all: '전체', member: '회원', instructor: '강사' }

// Server component, like ChatListScreen/MemberHomePage -- a read-only list
// gains nothing from client-side state, and fetching on the server skips the
// mount-then-fetch skeleton flash a useEffect-driven version would have.
export default async function AdminNoticesPage() {
  const notices = await listNotices()

  return (
    <div className="w-full px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-brand-tint">
          <Megaphone className="h-[19px] w-[19px] text-brand-deep" strokeWidth={1.75} />
        </span>
        <h1 className="text-heading-lg text-ink">공지사항</h1>
      </div>

      <Button href="/admin/notices/new" className="w-full">
        새 공지 작성
      </Button>

      {notices.length === 0 ? (
        <EmptyState className="mt-10" title="작성된 공지가 없습니다" description="위 버튼으로 첫 공지를 작성해보세요." />
      ) : (
        // pin desc, then created_at desc -- already the order listNotices()
        // returns, matching the design's "고정 공지가 항상 위, 그 아래는
        // 최신순" with no separate sort control.
        <ul className="mt-10 flex flex-col">
          {notices.map((notice) => (
            <li key={notice.id} className="border-t border-hairline py-4 first:border-t-0">
              <Link href={`/notices/${notice.id}`} className="block">
                <div className="mb-1.5 flex items-center gap-1.5">
                  {notice.pin && (
                    <Badge tone="brand" className="gap-1">
                      <Pin aria-hidden="true" className="h-2.5 w-2.5" strokeWidth={2} />
                      고정
                    </Badge>
                  )}
                  <Badge>{TARGET_LABEL[notice.target]}</Badge>
                </div>
                <p className="text-body-strong text-ink">{notice.title}</p>
                <p className="mt-1 text-caption text-muted">
                  {notice.created_at.slice(0, 10)} · 조회 {notice.views}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
