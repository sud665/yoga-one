import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withdrawAccount } from '@/lib/actions/profile'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

function buildFormData(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
}

function mockSupabase(rpcError: { message: string } | null = null) {
  const rpc = vi.fn(async () => ({ error: rpcError }))
  const signOut = vi.fn(async () => ({ error: null }))
  const client = { auth: { signOut }, rpc }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(createClient).mockResolvedValue(client as any)
  return { rpc, signOut }
}

describe('withdrawAccount', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
  })

  it('passes an empty reason as undefined, not an empty string', async () => {
    const { rpc } = mockSupabase()
    await withdrawAccount(buildFormData({ reason: '' }))
    expect(rpc).toHaveBeenCalledWith('withdraw_my_account', { p_reason: undefined })
  })

  it('passes a real reason through as-is', async () => {
    const { rpc } = mockSupabase()
    await withdrawAccount(buildFormData({ reason: '이사 · 거리' }))
    expect(rpc).toHaveBeenCalledWith('withdraw_my_account', { p_reason: '이사 · 거리' })
  })

  it('maps the RPC\'s owner_cannot_withdraw exception to a friendly message', async () => {
    mockSupabase({ message: 'owner_cannot_withdraw' })
    const result = await withdrawAccount(buildFormData({ reason: '' }))
    expect(result).toEqual({
      error: '원장 계정은 탈퇴할 수 없습니다. 스튜디오 이전이 필요하면 고객센터에 문의해주세요.',
    })
  })

  it('surfaces any other RPC error verbatim', async () => {
    mockSupabase({ message: 'profile_not_found' })
    const result = await withdrawAccount(buildFormData({ reason: '' }))
    expect(result).toEqual({ error: 'profile_not_found' })
  })

  it('signs the local session out after a successful withdrawal', async () => {
    const { signOut } = mockSupabase(null)
    const result = await withdrawAccount(buildFormData({ reason: '' }))
    expect(signOut).toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })

  it('does not sign out when the RPC fails', async () => {
    const { signOut } = mockSupabase({ message: 'profile_not_found' })
    await withdrawAccount(buildFormData({ reason: '' }))
    expect(signOut).not.toHaveBeenCalled()
  })
})
