import Link from 'next/link'
import { MessageCircle, Plus, Users } from 'lucide-react'

import { EmptyState } from '@/components/ui/EmptyState'
import { listMyConversations } from '@/lib/actions/chat'
import { roleHomePath } from '@/lib/role-home'
import type { ProfileRole } from '@/lib/types'

const ROLE_LABEL: Record<ProfileRole, string> = { owner: '원장', instructor: '강사', member: '회원' }

// KST HH:MM, no date -- every conversation in a yoga studio's chat is
// recent enough that "언제" only ever needs to distinguish times of day, not
// track which day (unlike kstToday()'s use sites, which pick a calendar
// date out of a whole schedule).
function formatTime(iso: string) {
  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' }).format(
    new Date(iso)
  )
}

export async function ChatListScreen({ role }: { role: ProfileRole }) {
  const base = roleHomePath(role)
  const rooms = await listMyConversations()

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-brand-tint">
            <MessageCircle className="h-[19px] w-[19px] text-brand-deep" strokeWidth={1.75} />
          </span>
          <h1 className="text-heading-lg text-ink">채팅</h1>
        </div>
        <Link
          href={`${base}/chat/new`}
          className="flex h-9 items-center gap-1.5 rounded-button border border-hairline px-3 text-label text-ink hover:bg-surface-soft"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          새 채팅
        </Link>
      </div>

      {rooms.length === 0 ? (
        <EmptyState title="대화가 없습니다" description="새 채팅을 눌러 대화를 시작해보세요." />
      ) : (
        <div className="flex flex-col">
          {rooms.map((room) => (
            <Link
              key={room.conversationId}
              href={`${base}/chat/${room.conversationId}`}
              className="flex items-center gap-3 border-t border-hairline py-3.5 first:border-t-0"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-soft text-body-strong text-ink">
                {room.kind === 'group' ? (
                  <Users className="h-5 w-5" strokeWidth={1.75} />
                ) : (
                  (room.otherName ?? '?').slice(0, 1)
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-1.5">
                  <span className="truncate text-body-strong text-ink">
                    {room.kind === 'group' ? room.title : room.otherName}
                  </span>
                  <span className="shrink-0 text-utility-xs text-muted">
                    {room.kind === 'group' ? '그룹' : room.otherRole ? ROLE_LABEL[room.otherRole] : ''}
                  </span>
                </span>
                <span className="block truncate text-body-md text-muted">{room.lastMessage ?? '대화를 시작해보세요'}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1.5">
                {room.lastMessageAt && <span className="text-utility-xs text-muted">{formatTime(room.lastMessageAt)}</span>}
                {room.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-deep px-1.5 text-utility-xs text-on-brand">
                    {room.unreadCount}
                  </span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
