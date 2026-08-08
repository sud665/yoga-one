'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pin, Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { deleteNotice } from '@/lib/actions/notices'
import type { Notice, NoticeTarget } from '@/lib/types'

const TARGET_LABEL: Record<NoticeTarget, string> = { all: '전체', member: '회원', instructor: '강사' }

const ICON_BUTTON =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors disabled:pointer-events-none disabled:opacity-50'

// AdminNoticesPage(부모)는 서버 컴포넌트로 남겨 목록 첫 로드에 스켈레톤
// 깜빡임이 없도록 하고, 행마다 필요한 상호작용(수정 링크·삭제 확인·토스트)만
// 이 클라이언트 컴포넌트로 분리한다 -- app/admin/schedule/page.tsx가 클래스
// 이름 대신 아이콘 버튼을 CTA로 쓰는 것과 같은 이유(RSC 경계로 아이콘 자체는
// 넘길 수 없어, 아이콘을 그리는 위치를 서버 대신 클라이언트로 옮긴 것).
export function NoticeRow({ notice }: { notice: Notice }) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function handleDelete() {
    if (!window.confirm(`"${notice.title}" 공지를 삭제할까요? 삭제하면 되돌릴 수 없습니다.`)) return
    setDeleting(true)
    const result = await deleteNotice(notice.id)
    setDeleting(false)
    if ('error' in result) {
      toast({ title: '삭제하지 못했습니다', description: result.error, tone: 'error' })
      return
    }
    toast({ title: '공지를 삭제했습니다', tone: 'success' })
    router.refresh()
  }

  return (
    <li className="flex items-center gap-2 border-t border-hairline py-4 first:border-t-0">
      <Link href={`/notices/${notice.id}`} className="block min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-1.5">
          {notice.pin && (
            <Badge tone="brand" className="gap-1">
              <Pin aria-hidden="true" className="h-2.5 w-2.5" strokeWidth={2} />
              고정
            </Badge>
          )}
          <Badge>{TARGET_LABEL[notice.target]}</Badge>
        </div>
        <p className="truncate text-body-strong text-ink">{notice.title}</p>
        <p className="mt-1 text-caption text-muted">
          {notice.created_at.slice(0, 10)} · 조회 {notice.views}
        </p>
      </Link>
      <div className="flex shrink-0 items-center gap-1.5">
        <Link
          href={`/admin/notices/${notice.id}/edit`}
          aria-label="공지 수정"
          className={`${ICON_BUTTON} border-hairline bg-surface text-muted hover:bg-surface-soft hover:text-ink`}
        >
          <Pencil aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
        </Link>
        <button
          type="button"
          aria-label="공지 삭제"
          onClick={handleDelete}
          disabled={deleting}
          className={`${ICON_BUTTON} border-danger bg-surface text-danger hover:bg-danger-tint`}
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </li>
  )
}
