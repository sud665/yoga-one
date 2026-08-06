import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getOrCreateDm, listDmCandidates, listMyConversations, sendMessage } from '@/lib/actions/chat'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockSupabase(rpcImpl: (fn: string, args?: any) => Promise<any>) {
  const rpc = vi.fn(rpcImpl)
  const client = { rpc }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(createClient).mockResolvedValue(client as any)
  return { rpc }
}

describe('sendMessage', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
  })

  it('rejects a blank message before calling the RPC at all', async () => {
    const { rpc } = mockSupabase(async () => ({ data: null, error: null }))
    const result = await sendMessage('conv-1', '   ')
    expect(result).toEqual({ error: '메시지를 입력해주세요.' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('trims the body before sending', async () => {
    const { rpc } = mockSupabase(async () => ({ data: {}, error: null }))
    await sendMessage('conv-1', '  안녕하세요  ')
    expect(rpc).toHaveBeenCalledWith('send_message', { p_conversation_id: 'conv-1', p_body: '안녕하세요' })
  })

  it('surfaces an RPC error (e.g. not_a_participant) verbatim', async () => {
    mockSupabase(async () => ({ data: null, error: { message: 'not_a_participant' } }))
    const result = await sendMessage('conv-1', '안녕하세요')
    expect(result).toEqual({ error: 'not_a_participant' })
  })
})

describe('getOrCreateDm', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
  })

  it('returns the conversation id on success', async () => {
    mockSupabase(async () => ({ data: 'conv-123', error: null }))
    const result = await getOrCreateDm('other-profile')
    expect(result).toEqual({ conversationId: 'conv-123' })
  })

  it('maps any RPC failure (pair_not_allowed, cannot_message_self, ...) to one generic message', async () => {
    mockSupabase(async () => ({ data: null, error: { message: 'pair_not_allowed' } }))
    const result = await getOrCreateDm('other-profile')
    expect(result).toEqual({ error: '대화를 시작할 수 없습니다.' })
  })
})

describe('listMyConversations', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
  })

  it('maps snake_case RPC rows to the camelCase shape the UI expects', async () => {
    mockSupabase(async () => ({
      data: [
        {
          conversation_id: 'c1',
          kind: 'dm',
          title: null,
          other_name: '김민지',
          other_role: 'member',
          last_message: '안녕하세요',
          last_message_at: '2026-08-05T00:00:00Z',
          unread_count: 2,
        },
      ],
      error: null,
    }))
    const result = await listMyConversations()
    expect(result).toEqual([
      {
        conversationId: 'c1',
        kind: 'dm',
        title: null,
        otherName: '김민지',
        otherRole: 'member',
        lastMessage: '안녕하세요',
        lastMessageAt: '2026-08-05T00:00:00Z',
        unreadCount: 2,
      },
    ])
  })

  it('returns an empty list rather than throwing when the RPC errors', async () => {
    mockSupabase(async () => ({ data: null, error: { message: 'boom' } }))
    const result = await listMyConversations()
    expect(result).toEqual([])
  })
})

describe('listDmCandidates', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
  })

  it('maps snake_case RPC rows to the camelCase shape the UI expects', async () => {
    mockSupabase(async () => ({
      data: [{ profile_id: 'p1', full_name: '박서연', role: 'instructor' }],
      error: null,
    }))
    const result = await listDmCandidates()
    expect(result).toEqual([{ profileId: 'p1', fullName: '박서연', role: 'instructor' }])
  })
})
