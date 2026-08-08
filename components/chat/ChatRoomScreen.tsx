'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Send, Users } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { markConversationRead, sendMessage } from '@/lib/actions/chat'
import { roleHomePath } from '@/lib/role-home'
import type { ProfileRole } from '@/lib/types'

const ROLE_LABEL: Record<ProfileRole, string> = { owner: '원장', instructor: '강사', member: '회원' }

type Message = {
  id: string
  senderId: string
  senderName: string
  body: string | null
  createdAt: string
}

type RoomHeader = {
  title: string
  subtitle: string
  participantCount: number
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' }).format(
    new Date(iso)
  )
}

export function ChatRoomScreen({ role, conversationId }: { role: ProfileRole; conversationId: string }) {
  const base = roleHomePath(role)
  const [myId, setMyId] = useState<string | null>(null)
  const [header, setHeader] = useState<RoomHeader | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // One-time load + realtime subscription. Reads go straight through the
  // browser client (CLAUDE.md: "Reads and realtime go through the Supabase
  // client SDK directly, with RLS doing tenant and role isolation") rather
  // than a server action -- a server action is a single request/response, it
  // can't hold the open connection a realtime subscription needs.
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session || cancelled) return
      setMyId(session.user.id)

      // supabase-js normally attaches the session's JWT to the realtime
      // connection itself, via an onAuthStateChange listener that fires
      // asynchronously (SIGNED_IN/INITIAL_SESSION) and calls
      // realtime.setAuth() in response. Subscribing to a channel before that
      // listener has actually run -- e.g. from this same effect, synchronously
      // on mount -- races it: the socket connects and joins with no JWT
      // attached, postgres_changes' RLS check then silently treats the
      // connection as unauthenticated, and nothing is ever forwarded. No
      // error anywhere -- confirmed live (INSERTs succeeded, "SUBSCRIBED"
      // fired, Kong logged a clean 101 upgrade, and the message still never
      // arrived) before adding this line. Setting it explicitly, and only
      // subscribing after it resolves, closes the race instead of hoping the
      // two async chains happen to finish in the right order.
      await supabase.realtime.setAuth(session.access_token)

      channel = supabase
        .channel(`room-${conversationId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
          async (payload) => {
            const row = payload.new as {
              id: string
              sender_id: string
              body: string | null
              created_at: string
            }
            const { data: sender } = await supabase.from('profiles').select('full_name').eq('id', row.sender_id).maybeSingle()
            if (cancelled) return
            // id-dedupe: handleSend() below already appends the sender's own
            // message optimistically (not waiting on this realtime echo), so
            // the INSERT this client itself caused would otherwise render
            // twice once this subscription event for it arrives too.
            setMessages((prev) =>
              prev.some((m) => m.id === row.id)
                ? prev
                : [...prev, { id: row.id, senderId: row.sender_id, senderName: sender?.full_name ?? '', body: row.body, createdAt: row.created_at }]
            )
            // A message arriving while the room is already open counts as
            // read immediately -- only messages sent before this screen was
            // opened wait for the explicit markConversationRead below.
            markConversationRead(conversationId)
          }
        )
        .subscribe()

      const [{ data: conversation }, { data: participants }, { data: history }] = await Promise.all([
        supabase.from('conversations').select('kind, title').eq('id', conversationId).maybeSingle(),
        supabase
          .from('conversation_participants')
          .select('profile_id, profiles(full_name, role)')
          .eq('conversation_id', conversationId),
        supabase
          .from('messages')
          .select('id, sender_id, body, created_at, profiles(full_name)')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true }),
      ])
      if (cancelled) return

      if (conversation && participants) {
        type ParticipantRow = { profile_id: string; profiles: { full_name: string; role: ProfileRole } | null }
        const others = (participants as ParticipantRow[]).filter((p) => p.profile_id !== session.user.id)
        const isGroup = conversation.kind === 'group'
        setHeader({
          title: isGroup ? (conversation.title ?? '그룹') : (others[0]?.profiles?.full_name ?? '대화'),
          subtitle: isGroup ? '스튜디오 전체' : others[0]?.profiles ? ROLE_LABEL[others[0].profiles.role] : '',
          participantCount: participants.length,
        })
      }

      if (history) {
        type MessageRow = { id: string; sender_id: string; body: string | null; created_at: string; profiles: { full_name: string } | null }
        setMessages(
          (history as MessageRow[]).map((m) => ({
            id: m.id,
            senderId: m.sender_id,
            senderName: m.profiles?.full_name ?? '',
            body: m.body,
            createdAt: m.created_at,
          }))
        )
      }

      await markConversationRead(conversationId)
    }

    load()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend() {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setSendError(null)
    setDraft('')
    const result = await sendMessage(conversationId, text)
    setSending(false)
    if ('error' in result) {
      setSendError(result.error)
      setDraft(text)
      return
    }
    // Append immediately rather than waiting for the realtime echo (QA sweep
    // 2026-08-08, item 8) -- senderName is left blank because showName below
    // never renders it for isMine messages anyway. The postgres_changes
    // handler above dedupes on id, so this doesn't double-render once that
    // event does arrive.
    if (myId) {
      setMessages((prev) =>
        prev.some((m) => m.id === result.id)
          ? prev
          : [...prev, { id: result.id, senderId: myId, senderName: '', body: text, createdAt: result.createdAt }]
      )
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-hairline bg-surface px-2">
        <Link href={`${base}/chat`} aria-label="뒤로" className="rounded-full p-2 text-ink hover:bg-surface-soft">
          <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-heading-md text-ink">{header?.title ?? ' '}</p>
          <p className="truncate text-utility-xs text-muted">{header?.subtitle}</p>
        </div>
        {header && header.participantCount > 0 && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-tint px-2.5 py-1 text-label text-brand-deep">
            <Users className="h-3.5 w-3.5" strokeWidth={2.25} />
            {header.participantCount}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
        {messages.map((message, index) => {
          const isMine = message.senderId === myId
          const showName = !isMine && (index === 0 || messages[index - 1].senderId !== message.senderId)
          return (
            <div key={message.id} className={`flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
              {showName && <span className="text-utility-xs text-muted">{message.senderName}</span>}
              <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : 'flex-row'} max-w-[82%]`}>
                <div
                  className={
                    isMine
                      ? 'whitespace-pre-wrap rounded-[14px_14px_4px_14px] bg-brand-deep px-3.5 py-2.5 text-body-md text-on-brand'
                      : 'whitespace-pre-wrap rounded-[14px_14px_14px_4px] border border-hairline bg-surface px-3.5 py-2.5 text-body-md text-ink'
                  }
                >
                  {message.body}
                </div>
                <span className="shrink-0 pb-0.5 text-utility-xs text-muted">{formatTime(message.createdAt)}</span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {sendError && (
        <p role="alert" className="px-4 text-body-md text-danger">
          {sendError}
        </p>
      )}

      <div className="flex shrink-0 items-center gap-2 border-t border-hairline bg-surface p-3">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              handleSend()
            }
          }}
          placeholder="메시지 입력"
          className="h-11 min-w-0 flex-1 rounded-input border border-hairline bg-surface px-3.5 text-body-md text-ink placeholder:text-muted focus:border-brand-deep focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          aria-label="보내기"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-deep text-on-brand disabled:opacity-50"
        >
          <Send className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}
