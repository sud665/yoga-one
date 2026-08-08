'use server'

import { createClient } from '@/lib/supabase/server'
import type { ProfileRole } from '@/lib/types'

export type ConversationSummary = {
  conversationId: string
  kind: 'dm' | 'group'
  title: string | null
  otherName: string | null
  otherRole: ProfileRole | null
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
}

// list_my_conversations (20260805000002) does the real aggregation --
// per-conversation last message + unread count relative to *this* caller's
// own read state, which isn't cheaply expressible as a plain RLS-scoped
// client select the way message history itself is (see ChatRoomScreen,
// which reads public.messages directly).
export async function listMyConversations(): Promise<ConversationSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('list_my_conversations')
  if (error || !data) return []

  return data.map((row) => ({
    conversationId: row.conversation_id,
    kind: row.kind,
    title: row.title,
    otherName: row.other_name,
    otherRole: row.other_role,
    lastMessage: row.last_message,
    lastMessageAt: row.last_message_at,
    unreadCount: row.unread_count,
  }))
}

export type DmCandidate = { profileId: string; fullName: string; role: ProfileRole }

export async function listDmCandidates(): Promise<DmCandidate[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('list_dm_candidates')
  if (error || !data) return []

  return data.map((row) => ({ profileId: row.profile_id, fullName: row.full_name, role: row.role }))
}

export async function getOrCreateDm(otherProfileId: string): Promise<{ error: string } | { conversationId: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_or_create_dm', { p_other_profile_id: otherProfileId })
  if (error || !data) {
    // get_or_create_dm's own guards (pair_not_allowed etc.) are internal
    // names, not user copy -- this path shouldn't normally be reachable
    // through the UI (list_dm_candidates already excludes disallowed pairs),
    // so a single generic message covers it rather than mapping each one.
    return { error: '대화를 시작할 수 없습니다.' }
  }
  return { conversationId: data }
}

// Returns the inserted row's id/created_at (not just success: true) so the
// caller (ChatRoomScreen) can append it to local state immediately instead
// of waiting on the realtime echo -- QA sweep 2026-08-08, item 8: a message
// sent right after opening a room could land before the postgres_changes
// subscription reached SUBSCRIBED (that handshake is async and unblocked,
// see the load() comment in ChatRoomScreen.tsx), so the INSERT committed but
// its realtime event was never delivered to the very client that caused it
// -- the message was in the database but silently missing from the sender's
// own screen until a reload re-fetched history from the table directly.
export async function sendMessage(
  conversationId: string,
  body: string
): Promise<{ error: string } | { success: true; id: string; createdAt: string }> {
  const trimmed = body.trim()
  if (!trimmed) {
    return { error: '메시지를 입력해주세요.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('send_message', { p_conversation_id: conversationId, p_body: trimmed })
  if (error || !data) {
    return { error: error?.message ?? '메시지를 보내지 못했습니다.' }
  }
  return { success: true, id: data.id, createdAt: data.created_at }
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId })
}
