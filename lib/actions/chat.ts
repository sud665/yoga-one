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

export async function sendMessage(conversationId: string, body: string): Promise<{ error: string } | { success: true }> {
  const trimmed = body.trim()
  if (!trimmed) {
    return { error: '메시지를 입력해주세요.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('send_message', { p_conversation_id: conversationId, p_body: trimmed })
  if (error) {
    return { error: error.message }
  }
  return { success: true }
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId })
}
