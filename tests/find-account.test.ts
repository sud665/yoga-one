import { describe, it, expect, vi, beforeEach } from 'vitest'
import { findEmailByNamePhone, requestPasswordReset, updatePasswordAfterReset } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/server'

// None of these three actions redirect() on any path (unlike
// signInWithPassword/signUpOwnerWithPassword) -- the new-password/found-email
// states are rendered client-side from the returned object instead, so
// next/navigation needs no mock here, mirroring
// tests/signup-owner-with-password.test.ts's reasoning for the same absence.
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

function buildFormData(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
}

function mockSupabase({
  rpcResult,
  resetError,
  updateError,
}: {
  rpcResult?: { data: string | null; error?: { message: string } | null }
  resetError?: { message: string } | null
  updateError?: { message: string } | null
} = {}) {
  const rpc = vi.fn(async () => rpcResult ?? { data: null, error: null })
  const resetPasswordForEmail = vi.fn(async () => ({ error: resetError ?? null }))
  const updateUser = vi.fn(async () => ({ error: updateError ?? null }))
  const client = {
    auth: { resetPasswordForEmail, updateUser },
    rpc,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(createClient).mockResolvedValue(client as any)
  return { rpc, resetPasswordForEmail, updateUser }
}

describe('findEmailByNamePhone', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
  })

  it('requires both fields before calling the RPC at all', async () => {
    const { rpc } = mockSupabase()
    const result = await findEmailByNamePhone(buildFormData({ fullName: '', phone: '010-1234-5678' }))
    expect(result).toEqual({ error: '이름과 전화번호를 입력해주세요.' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('returns the masked email the RPC already masked -- this action never sees the raw address', async () => {
    mockSupabase({ rpcResult: { data: 'me***@yogaone.demo', error: null } })
    const result = await findEmailByNamePhone(buildFormData({ fullName: '김민지', phone: '010-1234-5678' }))
    expect(result).toEqual({ email: 'me***@yogaone.demo' })
  })

  it('surfaces the same generic message for both an RPC error and a genuine no-match (null data) -- no oracle for which one happened', async () => {
    mockSupabase({ rpcResult: { data: null, error: null } })
    const noMatch = await findEmailByNamePhone(buildFormData({ fullName: '없는사람', phone: '010-0000-0000' }))
    expect(noMatch).toEqual({ error: '일치하는 계정을 찾을 수 없습니다.' })

    mockSupabase({ rpcResult: { data: null, error: { message: 'db error' } } })
    const rpcFailed = await findEmailByNamePhone(buildFormData({ fullName: '김민지', phone: '010-1234-5678' }))
    expect(rpcFailed).toEqual({ error: '일치하는 계정을 찾을 수 없습니다.' })
  })
})

describe('requestPasswordReset', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
  })

  it('requires an email before calling Supabase', async () => {
    const { resetPasswordForEmail } = mockSupabase()
    const result = await requestPasswordReset(buildFormData({ email: '' }))
    expect(result).toEqual({ error: '이메일을 입력해주세요.' })
    expect(resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('points redirectTo at /auth/reset, not /auth/callback', async () => {
    const { resetPasswordForEmail } = mockSupabase()
    await requestPasswordReset(buildFormData({ email: 'member1@yogaone.demo' }))
    expect(resetPasswordForEmail).toHaveBeenCalledWith(
      'member1@yogaone.demo',
      expect.objectContaining({ redirectTo: expect.stringContaining('/auth/reset') })
    )
  })

  it('reports sent on success, regardless of whether the account actually exists (Supabase\'s own anti-enumeration default)', async () => {
    mockSupabase({ resetError: null })
    const result = await requestPasswordReset(buildFormData({ email: 'nobody@yogaone.demo' }))
    expect(result).toEqual({ sent: true, email: 'nobody@yogaone.demo' })
  })

  it('surfaces a real API-level failure (e.g. rate limit) as an error', async () => {
    mockSupabase({ resetError: { message: 'rate limit exceeded' } })
    const result = await requestPasswordReset(buildFormData({ email: 'member1@yogaone.demo' }))
    expect(result).toEqual({ error: 'rate limit exceeded' })
  })
})

describe('updatePasswordAfterReset', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
  })

  it('rejects a password under 8 characters before calling Supabase', async () => {
    const { updateUser } = mockSupabase()
    const result = await updatePasswordAfterReset(buildFormData({ password: 'short1', passwordConfirm: 'short1' }))
    expect(result).toEqual({ error: '비밀번호는 8자 이상이어야 합니다.' })
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('rejects a mismatched confirmation before calling Supabase', async () => {
    const { updateUser } = mockSupabase()
    const result = await updatePasswordAfterReset(
      buildFormData({ password: 'newpass123', passwordConfirm: 'different123' })
    )
    expect(result).toEqual({ error: '비밀번호가 일치하지 않습니다.' })
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('calls updateUser with the new password and reports success', async () => {
    const { updateUser } = mockSupabase({ updateError: null })
    const result = await updatePasswordAfterReset(
      buildFormData({ password: 'newpass123', passwordConfirm: 'newpass123' })
    )
    expect(updateUser).toHaveBeenCalledWith({ password: 'newpass123' })
    expect(result).toEqual({ success: true })
  })

  // Maps to a Korean, actionable message rather than forwarding Supabase's
  // raw English text -- QA sweep 2026-08-08, item 9. This exact message is
  // what updateUser() throws when the recovery session /auth/reset was
  // supposed to establish never existed (link expired/already used/page
  // opened directly), the one failure mode reachable through normal use.
  it('maps an expired/missing recovery session to a Korean, actionable message instead of the raw Supabase text', async () => {
    mockSupabase({ updateError: { message: 'Auth session missing!' } })
    const result = await updatePasswordAfterReset(
      buildFormData({ password: 'newpass123', passwordConfirm: 'newpass123' })
    )
    expect(result).toEqual({ error: '재설정 링크가 만료되었거나 이미 사용되었습니다. 비밀번호 찾기를 다시 시도해주세요.' })
  })

  it('falls back to the raw Supabase message for an error this mapping does not recognize, instead of a false success', async () => {
    mockSupabase({ updateError: { message: 'some other Supabase error' } })
    const result = await updatePasswordAfterReset(
      buildFormData({ password: 'newpass123', passwordConfirm: 'newpass123' })
    )
    expect(result).toEqual({ error: 'some other Supabase error' })
  })
})
